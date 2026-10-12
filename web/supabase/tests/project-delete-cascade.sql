-- A user deleting their own project must still remove its dependent rows now that user
-- DELETE is revoked on test_runs and findings: FK cascades run as the table owner, not the
-- caller. FKs into projects/test_runs/findings: test_runs, findings, journey_steps,
-- project_scan_schedules (cascade); audit_jobs.project_id (set null). Saved tasks are
-- columns on projects. Synthetic data; rolls back.
begin;
insert into auth.users(id,email) values ('10000000-0000-4000-8000-000000000091','cascade@example.invalid');
insert into public.projects(id,user_id,name,url) values
 ('20000000-0000-4000-8000-000000000091','10000000-0000-4000-8000-000000000091','P','https://example.invalid');
insert into public.test_runs(id,user_id,project_id,url,status) values
 ('40000000-0000-4000-8000-000000000091','10000000-0000-4000-8000-000000000091','20000000-0000-4000-8000-000000000091','https://example.invalid','completed');
insert into public.findings(id,test_run_id,persona_id,severity,category,title,description,recommendation,page_url) values
 ('60000000-0000-4000-8000-000000000091','40000000-0000-4000-8000-000000000091','axe','minor','accessibility','t','d','r','https://example.invalid');
insert into public.journey_steps(test_run_id,persona_id,step,action) values
 ('40000000-0000-4000-8000-000000000091','p',0,'click');
insert into public.project_scan_schedules(id,project_id,user_id) values
 ('50000000-0000-4000-8000-000000000091','20000000-0000-4000-8000-000000000091','10000000-0000-4000-8000-000000000091');
insert into public.audit_jobs(id,user_id,project_id,url) values
 ('30000000-0000-4000-8000-000000000091','10000000-0000-4000-8000-000000000091','20000000-0000-4000-8000-000000000091','https://example.invalid');

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000091';
do $$ declare n int; begin
 delete from public.projects where id = '20000000-0000-4000-8000-000000000091';
 get diagnostics n = row_count;
 if n <> 1 then raise exception 'Owner could not delete own project'; end if;
 -- Direct deletes stay refused.
 begin
   delete from public.test_runs;
   raise exception 'direct test_runs delete must stay refused';
 exception when sqlstate '42501' then null; end;
end $$;
reset role;
do $$ begin
 if exists (select 1 from public.test_runs where id = '40000000-0000-4000-8000-000000000091') then raise exception 'test_runs not cascaded'; end if;
 if exists (select 1 from public.findings where id = '60000000-0000-4000-8000-000000000091') then raise exception 'findings not cascaded'; end if;
 if exists (select 1 from public.journey_steps where test_run_id = '40000000-0000-4000-8000-000000000091') then raise exception 'journey_steps not cascaded'; end if;
 if exists (select 1 from public.project_scan_schedules where id = '50000000-0000-4000-8000-000000000091') then raise exception 'schedule not cascaded'; end if;
 if (select project_id from public.audit_jobs where id = '30000000-0000-4000-8000-000000000091') is not null then raise exception 'audit_jobs.project_id not nulled'; end if;
end $$;
rollback;
