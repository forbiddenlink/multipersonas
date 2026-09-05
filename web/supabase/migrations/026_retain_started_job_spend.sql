-- A crashed agent may already have consumed its entire reserved budget.
-- Retain that debit and fail model jobs instead of retrying with no new reservation.
-- Zero-model-cost grades keep bounded retries.
create or replace function public.reap_stale_audit_jobs(
  p_timeout_seconds int default 900,
  p_max_attempts int default 2
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff timestamptz := now() - make_interval(secs => p_timeout_seconds);
  v_failed int := 0;
  v_dead record;
begin
  for v_dead in
    update public.audit_jobs
      set status = 'failed',
          error = 'Timed out while running the audit.',
          completed_at = now()
      where status = 'running'
        and started_at < v_cutoff
        and (reserved_calls > 0 or attempts >= p_max_attempts)
      returning id, reserved_calls, caller_key
  loop
    v_failed := v_failed + 1;
  end loop;

  update public.audit_jobs
    set status = 'queued', started_at = null
    where status = 'running'
      and started_at < v_cutoff
      and reserved_calls = 0
      and attempts < p_max_attempts;

  return v_failed;
end;
$$;

revoke all on function public.reap_stale_audit_jobs(int, int) from public, anon, authenticated;
grant execute on function public.reap_stale_audit_jobs(int, int) to service_role;
