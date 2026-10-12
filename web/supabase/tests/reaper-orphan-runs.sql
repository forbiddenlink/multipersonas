-- OPS-012: a worker hard-killed between the test_runs insert and saveHistoryRun leaves a
-- 'running' run with no finishing writer. The reaper fails runs stuck in 'running' past
-- the same timeout it uses for audit_jobs, and leaves everything else alone.
begin;
insert into auth.users(id,email) values ('10000000-0000-4000-8000-000000000061','orphan@example.invalid');
insert into public.test_runs(id,user_id,url,status,created_at,completed_at) values
 ('41000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000061','https://example.invalid/orphan','running', now() - interval '20 minutes', null),
 ('41000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000061','https://example.invalid/fresh','running', now(), null),
 ('41000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000061','https://example.invalid/done','completed', now() - interval '20 minutes', now() - interval '19 minutes'),
 ('41000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000061','https://example.invalid/failed','failed', now() - interval '20 minutes', now() - interval '19 minutes');
delete from public.audit_jobs;

do $$ begin
 perform public.reap_stale_audit_jobs(600, 3);
 if not exists (select 1 from public.test_runs where id = '41000000-0000-4000-8000-000000000001'
     and status = 'failed' and completed_at is not null) then
   raise exception 'Orphaned running run must be failed with a completed_at';
 end if;
 if not exists (select 1 from public.test_runs where id = '41000000-0000-4000-8000-000000000002' and status = 'running') then
   raise exception 'A fresh running run must be untouched';
 end if;
 if not exists (select 1 from public.test_runs where id = '41000000-0000-4000-8000-000000000003' and status = 'completed') then
   raise exception 'A completed run must be untouched';
 end if;
 -- The return value still counts audit jobs only, so the worker alert stays meaningful.
 if public.reap_stale_audit_jobs(600, 3) <> 0 then
   raise exception 'Repeat reap must recover nothing and return 0';
 end if;
 if has_function_privilege('anon', 'public.reap_stale_audit_jobs(int,int)', 'execute')
    or has_function_privilege('authenticated', 'public.reap_stale_audit_jobs(int,int)', 'execute') then
   raise exception 'Reaper must remain service-only';
 end if;
end $$;
rollback;
