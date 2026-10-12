-- ABU-001 / SEC-004: stop anonymous grade jobs queueing ahead of paid audits.
--
-- claim_audit_job (005) took the oldest queued row of any kind. Anonymous grade jobs
-- (up to 25 queued, each able to run to the 300 s job timeout) and paid persona audits
-- shared that one FIFO queue behind one sequential worker, so a stalling-page flood of
-- grades could keep paid audits and scheduled scans waiting for about two hours.
--
-- New order: audits first, then grades. To keep grades from starving behind a steady
-- stream of audits, a grade queued longer than 10 minutes counts as an audit for ordering
-- and the two then compete by created_at. Worst case a grade waits about 10 minutes plus
-- the aged jobs ahead of it. The 25-job grade queue cap (028) is unchanged.
--
-- Replaces the function body only. Signature, SECURITY DEFINER, pinned search_path and
-- the service-role-only grants (005, 007) are restated and unchanged. Additive and
-- replayable: create or replace.

create or replace function public.claim_audit_job()
returns public.audit_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.audit_jobs;
begin
  update public.audit_jobs
    set status = 'running', started_at = now(), attempts = attempts + 1
    where id = (
      select id from public.audit_jobs
      where status = 'queued'
      order by
        (kind = 'audit' or created_at < now() - interval '10 minutes') desc,
        created_at
      for update skip locked
      limit 1
    )
  returning * into v_job;
  return v_job;
end;
$$;

revoke all on function public.claim_audit_job() from public, anon, authenticated;
grant execute on function public.claim_audit_job() to service_role;
