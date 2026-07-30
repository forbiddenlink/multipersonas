-- 013: audit-job failure recovery + spend release (audit 2026-07-30, P0 #2/#3).
--
-- Two production gaps this closes:
--   #2 A worker that crashes / is SIGKILLed / hangs between claim and the try/catch
--      leaves its row stuck in 'running' forever — claim_audit_job only ever moves
--      'queued' rows, and nothing moved a dead 'running' row back. No reaper, no
--      visibility timeout, and `attempts` was incremented on claim but never read.
--   #3 The web route reserves model-call budget (reserve_model_calls) BEFORE enqueue
--      and nothing ever released it, so every failed / stuck / crashed job permanently
--      burned the daily cap until UTC midnight — a slow self-DoS.
--
-- Both RPCs are service-role only (SECURITY DEFINER + pinned search_path + EXECUTE
-- revoked from anon/authenticated), matching 004/005.

-- Remember how much each job reserved so a failure can release EXACTLY that much
-- (no re-deriving the estimate in the worker, which can't import the web limits).
alter table public.audit_jobs
  add column if not exists reserved_calls int not null default 0;

-- Refund model-call budget to today's counter, floored at zero. Called by the web
-- route when enqueue fails after a successful reserve, and by the worker + reaper on
-- terminal job failure.
create or replace function public.release_model_calls(p_calls int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'utc')::date;
begin
  if p_calls is null or p_calls <= 0 then
    return;
  end if;
  update public.usage_counters
    set model_calls = greatest(0, model_calls - p_calls),
        runs = greatest(0, runs - 1)
    where day = v_day;
end;
$$;

-- Visibility timeout + dead-letter. For every job stuck in 'running' past the timeout:
--   - attempts >= max  -> mark 'failed' (dead-letter) and release its reserved budget
--   - attempts <  max  -> back to 'queued' for another attempt (keep the reservation;
--                         the retry will use it)
-- Returns the number of jobs acted on. Call it periodically from the worker.
create or replace function public.reap_stale_audit_jobs(
  p_timeout_seconds int,
  p_max_attempts int
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff timestamptz := now() - make_interval(secs => p_timeout_seconds);
  v_failed int := 0;
  v_released int := 0;
  v_requeued int := 0;
begin
  -- Dead-letter the ones that have used up their attempts; sum their reservations.
  with dead as (
    update public.audit_jobs
      set status = 'failed',
          error = 'worker timed out — reaped after ' || p_timeout_seconds || 's',
          completed_at = now()
      where status = 'running'
        and started_at < v_cutoff
        and attempts >= p_max_attempts
    returning reserved_calls
  )
  select count(*), coalesce(sum(reserved_calls), 0)::int into v_failed, v_released from dead;

  if v_released > 0 then
    perform public.release_model_calls(v_released);
  end if;

  -- Requeue the rest for another claim.
  with requeued as (
    update public.audit_jobs
      set status = 'queued', started_at = null
      where status = 'running'
        and started_at < v_cutoff
        and attempts < p_max_attempts
    returning id
  )
  select count(*) into v_requeued from requeued;

  return v_failed + v_requeued;
end;
$$;

revoke all on function public.release_model_calls(int) from public, anon, authenticated;
revoke all on function public.reap_stale_audit_jobs(int, int) from public, anon, authenticated;
grant execute on function public.release_model_calls(int) to service_role;
grant execute on function public.reap_stale_audit_jobs(int, int) to service_role;
