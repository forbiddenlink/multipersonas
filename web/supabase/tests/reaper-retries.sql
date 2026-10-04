begin;
-- Only synthetic rows in a disposable local database; rollback every fixture.
delete from public.audit_jobs;
insert into public.audit_jobs(id, url, kind, status, started_at, attempts)
values
 ('31000000-0000-4000-8000-000000000001', 'https://example.invalid/retry', 'grade', 'running', now() - interval '20 minutes', 1),
 ('31000000-0000-4000-8000-000000000002', 'https://example.invalid/exhausted', 'grade', 'running', now() - interval '20 minutes', 3),
 ('31000000-0000-4000-8000-000000000003', 'https://example.invalid/fresh', 'grade', 'running', now(), 1);
do $$ declare recovered int; begin
  recovered := public.reap_stale_audit_jobs(600, 3);
  if recovered <> 2 then
    raise exception 'Recovery must report both retried and failed jobs; got %', recovered;
  end if;
  if not exists (select 1 from public.audit_jobs where id = '31000000-0000-4000-8000-000000000001'
    and status = 'queued' and started_at is null and attempts = 1) then
    raise exception 'Retryable grade must return to the queue without consuming an attempt';
  end if;
  if not exists (select 1 from public.audit_jobs where id = '31000000-0000-4000-8000-000000000002'
    and status = 'failed' and completed_at is not null) then
    raise exception 'Exhausted grade must be terminal';
  end if;
  if not exists (select 1 from public.audit_jobs where id = '31000000-0000-4000-8000-000000000003'
    and status = 'running' and attempts = 1) then
    raise exception 'Fresh running work must be untouched';
  end if;
  if public.reap_stale_audit_jobs(600, 3) <> 0 then
    raise exception 'Repeated maintenance must not recover the same job twice';
  end if;
  if has_function_privilege('anon', 'public.reap_stale_audit_jobs(int,int)', 'execute') or
     has_function_privilege('authenticated', 'public.reap_stale_audit_jobs(int,int)', 'execute') then
    raise exception 'Recovery must remain service-only';
  end if;
end $$;
rollback;
