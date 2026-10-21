-- Expiring grace window for past_due subscriptions.
--
-- Stripe can leave a subscription `past_due` after its retries finish, and no event fires
-- when that window runs out. Keeping paid access on `past_due` therefore needs an end date
-- the app can check at read time. The Stripe webhook (service role) writes
-- access_grace_ends_at only while the strongest paid grant rests on a past_due subscription
-- (first past_due sync + at most 7 days, see PAST_DUE_GRACE_DAYS in web/src/lib/plans.ts; once set it is never moved forward while the subscription stays past_due) and
-- clears it when a subscription is active, trialing or gone. Plan reads
-- (web/src/lib/entitlements.ts) treat a paid plan as free once this instant has passed.
--
-- Users cannot write it: 025 already revoked table-level UPDATE on profiles and granted only
-- full_name, avatar_url and agency_name, so a new column is service-role-only by default.
-- Additive and replayable; existing rows stay null (no grace limit).

alter table public.profiles add column if not exists access_grace_ends_at timestamptz;

-- access_grace_anchors: {subscription_id: {"plan": "pro"|"team", "ends_at": first deadline}} for
-- each subscription that is still past_due. Each subscription's window is fixed at its own first
-- past_due sync, so a billing period advance on one cannot extend it and another's deadline cannot
-- cap or restore it. The tier is stored with the deadline so effective_plan (and planAfterGrace)
-- can pick the highest tier whose own window is still open, instead of dropping to free when the
-- strongest tier's window ends while a lower tier's is still running. Dropped entries clear when a
-- subscription stops being past_due. Service-role-only.
alter table public.profiles add column if not exists access_grace_anchors jsonb;

-- grace_fallback_plan: the strongest plan still backed by a non-delinquent subscription while a
-- stronger one is in grace (for example an active Solo plus a past_due Agency). When the grace
-- window ends, effective_plan falls back to it instead of 'free'. Null means nothing else is
-- paid. Service-role-only for the same reason as access_grace_ends_at.
alter table public.profiles add column if not exists grace_fallback_plan text
  check (grace_fallback_plan is null or grace_fallback_plan in ('pro', 'team'));

-- effective_plan: the plan to honour in SQL, mirroring planAfterGrace in web/src/lib/plans.ts.
-- With access_grace_ends_at null the stored plan stands. Otherwise, when anchors exist, it is the
-- highest tier whose anchor window is still open, or grace_fallback_plan (the firm plan), never
-- above the stored plan. Rows with no anchors keep the older rule: an expired access_grace_ends_at
-- reads as grace_fallback_plan (default 'free'). Every SQL reader of profiles.plan below goes
-- through it, so a lapsed past_due account cannot keep scheduled scans, a higher project cap or
-- white-label share-link branding.
create or replace function public.effective_plan(p public.profiles)
returns text
language sql
stable
as $$
  select case
    when p.access_grace_ends_at is null then p.plan
    when jsonb_typeof(p.access_grace_anchors) = 'object' and exists (
      select 1 from jsonb_each(p.access_grace_anchors) a
      where jsonb_typeof(a.value) = 'object' and a.value->>'plan' in ('pro', 'team')
    ) then (
      select case least(b.best, case p.plan when 'team' then 2 when 'pro' then 1 else 0 end)
        when 2 then 'team' when 1 then 'pro' else 'free' end
      from (
        select coalesce(max(r), 0) as best from (
          select case a.value->>'plan' when 'team' then 2 else 1 end as r
          from jsonb_each(p.access_grace_anchors) a
          where jsonb_typeof(a.value) = 'object' and a.value->>'plan' in ('pro', 'team')
            and (a.value->>'ends_at')::timestamptz > now()
          union all
          select case p.grace_fallback_plan when 'team' then 2 when 'pro' then 1 else 0 end
        ) s
      ) b
    )
    when p.access_grace_ends_at <= now() then coalesce(p.grace_fallback_plan, 'free')
    else p.plan
  end
$$;

-- Project cap (was 20261004190000_enforce_project_cap.sql): same body, effective plan.
create or replace function public.enforce_project_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_limit int;
begin
  select public.effective_plan(pf) into v_plan from public.profiles pf where pf.id = new.user_id for update;
  if not found then
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  end if;

  v_limit := case v_plan
    when 'team' then null
    when 'pro' then 5
    else 1
  end;

  if v_limit is not null
     and (select count(*) from public.projects where user_id = new.user_id) >= v_limit then
    raise exception 'project_limit'
      using errcode = 'PA001', detail = 'limit=' || v_limit;
  end if;

  return new;
end;
$$;

-- Scheduled scans (was 20261012130100_scheduled_scan_trial_cap.sql): same body, effective plan.
create or replace function public.enqueue_due_project_scan_schedules(
  p_limit int default 10,
  p_daily_cap int default 5000,
  p_caller_cap int default 250,
  p_calls_per_persona int default 25,
  p_trial_caller_cap int default 75
)
returns table(schedule_id uuid, job_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule record;
  v_job_id uuid;
  v_calls int;
begin
  for v_schedule in
    with eligible as (
      select s.id,
        sum(cardinality(s.persona_ids) * p_calls_per_persona) over (
          partition by s.user_id order by s.next_run_at, s.id
        ) as planned_calls,
        coalesce(u.model_calls, 0) as used_calls,
        case when owner.trial_ends_at > now() then least(p_trial_caller_cap, p_caller_cap) else p_caller_cap end as user_cap
      from public.project_scan_schedules s
      join public.projects p on p.id = s.project_id and p.user_id = s.user_id
      join public.profiles owner on owner.id = s.user_id
      left join public.usage_counters_by_caller u
        on u.caller = s.user_id::text and u.day = (now() at time zone 'utc')::date
      where public.effective_plan(owner) in ('pro', 'team') and s.enabled
        and s.next_run_at <= now() and cardinality(s.persona_ids) between 1 and 5
        -- Exclude jobs that cannot fit individually before the FIFO running sum:
        -- an oversized older job must not block smaller jobs that fit today.
        and coalesce(u.model_calls, 0) + cardinality(s.persona_ids) * p_calls_per_persona <=
          case when owner.trial_ends_at > now() then least(p_trial_caller_cap, p_caller_cap) else p_caller_cap end
    )
    select
      s.id,
      s.project_id,
      s.user_id,
      s.interval,
      s.persona_ids,
      p.url,
      e.user_cap
    from public.project_scan_schedules s
    join eligible e on e.id = s.id and e.used_calls + e.planned_calls <= e.user_cap
    join public.projects p on p.id = s.project_id and p.user_id = s.user_id
    join public.profiles owner on owner.id = s.user_id
    where public.effective_plan(owner) in ('pro', 'team')
      and s.enabled = true
      and cardinality(s.persona_ids) between 1 and 5
      and s.next_run_at <= now()
    order by s.next_run_at asc
    for update of s skip locked
    limit least(greatest(p_limit, 0), 25)
  loop
    v_calls := cardinality(v_schedule.persona_ids) * p_calls_per_persona;
    if v_calls is null or v_calls <= 0 or not public.reserve_model_calls_scoped(
      v_calls, p_daily_cap, v_schedule.user_id::text, v_schedule.user_cap
    ) then
      continue;
    end if;

    v_job_id := public.enqueue_audit_job(
      p_url := v_schedule.url,
      p_user_id := v_schedule.user_id,
      p_project_id := v_schedule.project_id,
      p_persona_ids := v_schedule.persona_ids,
      p_kind := 'audit',
      p_reserved_calls := v_calls,
      p_caller_key := v_schedule.user_id::text
    );

    update public.project_scan_schedules
      set last_run_at = now(),
          next_run_at = case v_schedule.interval
            when 'monthly' then now() + interval '1 month'
            else now() + interval '7 days'
          end,
          last_job_id = v_job_id
      where id = v_schedule.id;

    schedule_id := v_schedule.id;
    job_id := v_job_id;
    return next;
  end loop;
end;
$$;

-- Share link (was 20261010120000_report_share_links.sql): white-label only on an effective team plan.
create or replace function public.get_shared_report(p_token text)
returns table (
  run_id uuid,
  url text,
  created_at timestamptz,
  persona_ids text[],
  task_definition jsonb,
  task_outcomes jsonb,
  scan_coverage jsonb,
  client_name text,
  agency_name text
)
language sql
security definer
set search_path = public
stable
as $$
  select r.id, r.url, r.created_at, r.persona_ids, r.task_definition,
         r.task_outcomes, r.scan_coverage,
         pr.name,
         case when public.effective_plan(pf) = 'team' then pf.agency_name end
  from public.test_runs r
  -- Match the project's owner too: the existing test_runs policies do not stop an owner
  -- from pointing project_id at another user's project, and that name must not leak.
  left join public.projects pr on pr.id = r.project_id and pr.user_id = r.user_id
  left join public.profiles pf on pf.id = r.user_id
  where r.id = public._shared_run_id(p_token)
$$;
