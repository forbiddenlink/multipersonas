-- SEC-013 follow-up: remove a deadlock in the on-write prune from 20261012120200.
--
-- That version pruned BEFORE its own upsert. FOR UPDATE SKIP LOCKED only covers row
-- selection; the row locks taken by the DELETE are held until commit. Two concurrent
-- calls could each delete an expired row whose key the other was about to upsert, then
-- each block on its own upsert waiting for the other's uncommitted delete: a deadlock.
--
-- Lock-order argument for this version: a call takes its own key row FIRST (the upsert),
-- and only then prunes, always with SKIP LOCKED and never touching p_key. After the upsert
-- the call performs no further blocking lock acquisition: every prune row is either locked
-- non-blockingly or skipped. A transaction that never waits while holding locks cannot be
-- part of a wait-for cycle, so no deadlock is possible between consume_rate_limit calls.
-- The same applies to usage_counters_by_caller, which is pruned last, with SKIP LOCKED.
--
-- Cost of the new order: a call may now wait on a concurrent transaction's pending delete
-- of its own expired key row for that transaction's short remaining lifetime. That wait
-- ends when the pruner commits (it never waits on us). The limiter logic, batch size and
-- 1-day and 2-day retention are unchanged. Signature, SECURITY DEFINER, pinned search_path
-- and service-role-only grants are restated. Replayable: create or replace.
-- Test: web/supabase/tests/rate-limit-prune-concurrency.py (several psql sessions).

create or replace function public.consume_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count int;
begin
  insert into public.rate_limits(key, window_start, count)
    values (p_key, v_now, 1)
  on conflict (key) do update set
    window_start = case
      when public.rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
      then v_now else public.rate_limits.window_start end,
    count = case
      when public.rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
      then 1 else public.rate_limits.count + 1 end
  returning count into v_count;

  -- Prune only after our own row is locked, skipping anything another transaction holds
  -- and never our own key.
  delete from public.rate_limits
    where key in (
      select key from public.rate_limits
      where window_start < v_now - interval '1 day' and key <> p_key
      order by window_start
      limit 50
      for update skip locked
    );
  delete from public.usage_counters_by_caller
    where (day, caller) in (
      select day, caller from public.usage_counters_by_caller
      where day < (v_now at time zone 'utc')::date - 2
      order by day
      limit 50
      for update skip locked
    );

  return v_count <= p_max;
end;
$$;

revoke all on function public.consume_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, int, int) to service_role;
