-- Report every recovered job to the worker, including zero-cost grade retries.
-- Keep the existing reservation policy: model jobs fail without a refund.
-- audit_jobs remains the authoritative lifecycle record for public grades.
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
  v_requeued int := 0;
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

  get diagnostics v_requeued = row_count;

  return v_failed + v_requeued;
end;
$$;

revoke all on function public.reap_stale_audit_jobs(int, int) from public, anon, authenticated;
grant execute on function public.reap_stale_audit_jobs(int, int) to service_role;
