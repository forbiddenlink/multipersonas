-- SEC-013: rate_limits and usage_counters_by_caller grew without bound.
--
-- rate_limits gets one row per key (an IP, or a user id) that is never deleted once its
-- window passes, and usage_counters_by_caller gets one row per caller per UTC day. Both
-- are keyed by attacker-influenced values (IPv6 addresses especially), so growth is
-- unbounded, though slow.
--
-- No pg_cron is used anywhere in these migrations, so pruning happens on write: each
-- consume_rate_limit call deletes at most 50 expired rate_limits rows (window_start older
-- than 1 day; every window in web/src/lib/limits.ts is at most 1 hour) and at most 50
-- usage_counters_by_caller rows older than 2 days (spend caps only read today's day).
-- The batch cap keeps a request from stalling on a backlog; the backlog drains over
-- normal traffic. Deletes use skip locked so concurrent callers do not queue behind each
-- other. Two new indexes make the expiry lookup an index scan.
--
-- The limiter logic is unchanged. Signature, SECURITY DEFINER, pinned search_path and
-- service-role-only grants (004, 007) are restated. Additive and replayable.

create index if not exists idx_rate_limits_window_start on public.rate_limits (window_start);
create index if not exists idx_usage_counters_by_caller_day on public.usage_counters_by_caller (day);

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
  delete from public.rate_limits
    where key in (
      select key from public.rate_limits
      where window_start < v_now - interval '1 day'
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
  return v_count <= p_max;
end;
$$;

revoke all on function public.consume_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, int, int) to service_role;
