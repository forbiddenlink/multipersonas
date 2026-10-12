-- OPS-012: fail test_runs orphaned in 'running' by a hard-killed worker.
--
-- The worker inserts a test_runs row as 'running', writes the findings, then marks the run
-- completed (worker/src/index.ts persistHistory, job-write.ts saveHistoryRun). A SIGKILL or
-- OOM in that window leaves a 'running' run that nothing finishes, which shows up as a
-- stuck audit in the owner's history. The reaper only handled audit_jobs.
--
-- reap_stale_audit_jobs now also marks test_runs that have sat in 'running' past the same
-- timeout as failed, with a completed_at. The window between insert and completion is
-- seconds, so the audit_jobs timeout (default 600 s) cannot catch a live write. The return
-- value is unchanged (audit jobs recovered) so the worker's "reaped N" alert keeps its
-- meaning.
--
-- Body is 20260929125009 plus the test_runs update. Signature, SECURITY DEFINER, pinned
-- search_path and service-role-only grants are restated. Additive and replayable.

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

  update public.test_runs
    set status = 'failed', completed_at = now()
    where status = 'running'
      and created_at < v_cutoff;

  return v_failed + v_requeued;
end;
$$;

revoke all on function public.reap_stale_audit_jobs(int, int) from public, anon, authenticated;
grant execute on function public.reap_stale_audit_jobs(int, int) to service_role;
