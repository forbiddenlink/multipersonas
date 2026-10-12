-- ABU-002 follow-up: scheduled scans honour the trial cap.
--
-- The scheduler (024) used one caller cap for everyone, so a trialing account could reserve
-- up to the full per-caller cap (225 of 250 calls with three weekly schedules) through
-- schedules even though manual runs are capped lower for trials (20261012120400,
-- web/src/lib/spend.ts). Here a caller whose profiles.trial_ends_at is in the future gets
-- least(p_trial_caller_cap, p_caller_cap) in both the per-schedule fit check, the FIFO
-- running-sum check and the scoped reservation.
--
-- Signature: the trial cap has to reach SQL, so a fifth parameter p_trial_caller_cap
-- (default 75, matching AUDIT_TRIAL_CALLER_DAILY_CALL_CAP) is added. The four-argument
-- function is dropped so exactly one overload exists; calls with four arguments (named or
-- positional) still resolve and enforce the default trial cap. Grants are service-role
-- only, as in 024. Additive in effect and replayable: drop if exists, then create.

drop function if exists public.enqueue_due_project_scan_schedules(int, int, int, int);
drop function if exists public.enqueue_due_project_scan_schedules(int, int, int, int, int);

create function public.enqueue_due_project_scan_schedules(
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
      where owner.plan in ('pro', 'team') and s.enabled
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
    where owner.plan in ('pro', 'team')
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

revoke all on function public.enqueue_due_project_scan_schedules(int, int, int, int, int) from public, anon, authenticated;
grant execute on function public.enqueue_due_project_scan_schedules(int, int, int, int, int) to service_role;
