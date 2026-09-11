-- 020: close two leftover holes from the grade queue + per-caller spend split.
--
-- 1) reap_stale_audit_jobs only flipped audit_jobs.status. A dead-lettered
--    kind='grade' job left its grader_scans row at queued/running, so the public
--    /grade/[token] page polled forever. Sync the scan when we dead-letter or
--    requeue.
--
-- 2) Per-caller spend (017/018) is reserved at enqueue, but worker/reaper
--    refunds were global-only because the caller key was not on the job row.
--    Store caller_key and refund both counters on terminal failure. Rows
--    claimed before this migration have NULL caller_key and keep the old
--    global-only refund.

alter table public.audit_jobs
  add column if not exists caller_key text;

-- Same defaults-preserving note as 013: prod already has DEFAULT 900 / DEFAULT 2 on
-- this signature (from migration 022), and CREATE OR REPLACE cannot strip an existing
-- default, so this redefinition must keep restating it.
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
  -- Dead-letter jobs that have used up their attempts. Refund each row's
  -- reservation (scoped when we know the caller, global otherwise) and fail
  -- any linked public grade scan so the poll page can stop.
  for v_dead in
    update public.audit_jobs
      set status = 'failed',
          error = 'worker timed out — reaped after ' || p_timeout_seconds || 's',
          completed_at = now()
      where status = 'running'
        and started_at < v_cutoff
        and attempts >= p_max_attempts
    returning id, reserved_calls, caller_key
  loop
    v_failed := v_failed + 1;
    if v_dead.reserved_calls > 0 then
      if v_dead.caller_key is not null and length(v_dead.caller_key) > 0 then
        perform public.release_model_calls_scoped(v_dead.reserved_calls, v_dead.caller_key);
      else
        perform public.release_model_calls(v_dead.reserved_calls);
      end if;
    end if;
    update public.grader_scans
      set status = 'failed',
          error = 'The scan timed out. Try again, or try a smaller site.'
      where job_id = v_dead.id
        and status in ('queued', 'running');
  end loop;

  -- Requeue the rest for another claim. A grade scan that was marked running
  -- must go back to queued so a later poll is honest about wait vs work.
  with requeued as (
    update public.audit_jobs
      set status = 'queued', started_at = null
      where status = 'running'
        and started_at < v_cutoff
        and attempts < p_max_attempts
    returning id
  ), synced as (
    update public.grader_scans
      set status = 'queued', error = null
      where job_id in (select id from requeued)
        and status = 'running'
    returning job_id
  )
  select count(*) into v_requeued from requeued;

  return v_failed + v_requeued;
end;
$$;
