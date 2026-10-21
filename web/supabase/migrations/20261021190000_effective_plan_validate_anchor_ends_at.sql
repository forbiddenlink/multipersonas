-- effective_plan: skip grace anchors whose ends_at is not a usable deadline.
--
-- parseGraceAnchors in web/src/lib/plans.ts ignores an anchor whose plan is not 'pro'/'team' or
-- whose ends_at is not a string holding a parseable date, and planAfterGrace falls back to the
-- legacy access_grace_ends_at rule when no valid anchor remains. The SQL in
-- 20261020190000_profiles_access_grace_ends_at.sql only checked the plan, so an anchor with a
-- missing or malformed ends_at made SQL read 'free' (or raise on the ::timestamptz cast) while
-- TypeScript kept the stored plan. The Stripe webhook always writes valid timestamps, so no
-- production path reaches this today; this closes the disagreement.
--
-- Validity here: plan in ('pro','team'), ends_at is a JSON string, and pg_input_is_valid says it
-- casts to timestamptz (never raises). The cast happens inside a CASE so it only runs on strings
-- that passed that check. Same body otherwise; replayable.

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
        and jsonb_typeof(a.value->'ends_at') = 'string'
        and pg_input_is_valid(a.value->>'ends_at', 'timestamptz')
    ) then (
      select case least(b.best, case p.plan when 'team' then 2 when 'pro' then 1 else 0 end)
        when 2 then 'team' when 1 then 'pro' else 'free' end
      from (
        select coalesce(max(r), 0) as best from (
          select case a.value->>'plan' when 'team' then 2 else 1 end as r
          from jsonb_each(p.access_grace_anchors) a
          where jsonb_typeof(a.value) = 'object' and a.value->>'plan' in ('pro', 'team')
            and jsonb_typeof(a.value->'ends_at') = 'string'
            and pg_input_is_valid(a.value->>'ends_at', 'timestamptz')
            and case when jsonb_typeof(a.value->'ends_at') = 'string'
                      and pg_input_is_valid(a.value->>'ends_at', 'timestamptz')
                     then (a.value->>'ends_at')::timestamptz > now() else false end
          union all
          select case p.grace_fallback_plan when 'team' then 2 when 'pro' then 1 else 0 end
        ) s
      ) b
    )
    when p.access_grace_ends_at <= now() then coalesce(p.grace_fallback_plan, 'free')
    else p.plan
  end
$$;
