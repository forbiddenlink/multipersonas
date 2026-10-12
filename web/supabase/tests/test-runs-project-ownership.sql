-- Cross-tenant reference gap: a caller must not point a run at another user's project, or a
-- schedule at another user's audit job. Synthetic users only; everything rolls back.
begin;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000041','own-a@example.invalid'),
 ('10000000-0000-4000-8000-000000000042','own-b@example.invalid');
insert into public.projects(id,user_id,name,url) values
 ('20000000-0000-4000-8000-000000000041','10000000-0000-4000-8000-000000000041','A','https://example.invalid'),
 ('20000000-0000-4000-8000-000000000042','10000000-0000-4000-8000-000000000042','B','https://example.invalid');
insert into public.audit_jobs(id,user_id,url) values
 ('30000000-0000-4000-8000-000000000041','10000000-0000-4000-8000-000000000041','https://example.invalid'),
 ('30000000-0000-4000-8000-000000000042','10000000-0000-4000-8000-000000000042','https://example.invalid');
-- Runs seeded by the service path (the worker writes test_runs; users cannot, see
-- evidence-write-boundary.sql). A's run points at A's project, B's at B's.
insert into public.test_runs(id,user_id,project_id,url) values
 ('40000000-0000-4000-8000-000000000041','10000000-0000-4000-8000-000000000041','20000000-0000-4000-8000-000000000041','https://example.invalid'),
 ('40000000-0000-4000-8000-000000000042','10000000-0000-4000-8000-000000000042','20000000-0000-4000-8000-000000000042','https://example.invalid');

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000041';
do $$ declare affected int; begin
 -- A user can no longer write test_runs.project_id at all (column grant), so a cross-tenant
 -- project pointer cannot be planted whether by insert or by re-pointing an own run.
 begin
   insert into public.test_runs(user_id,project_id,url) values
    ('10000000-0000-4000-8000-000000000041','20000000-0000-4000-8000-000000000042','https://example.invalid');
   raise exception 'Tenant A inserted a run pointing at tenant B project';
 exception when sqlstate '42501' then null;
 end;
 begin
   update public.test_runs set project_id = '20000000-0000-4000-8000-000000000042' where id = '40000000-0000-4000-8000-000000000041';
   raise exception 'Tenant A re-pointed their run at tenant B project';
 exception when sqlstate '42501' then null;
 end;
 begin
   update public.test_runs set project_id = null where id = '40000000-0000-4000-8000-000000000041';
   raise exception 'Tenant A rewrote their run project';
 exception when sqlstate '42501' then null;
 end;

 -- Schedules: own project + own job allowed; B's job or project refused.
 insert into public.project_scan_schedules(id,project_id,user_id,last_job_id) values
  ('50000000-0000-4000-8000-000000000041','20000000-0000-4000-8000-000000000041','10000000-0000-4000-8000-000000000041','30000000-0000-4000-8000-000000000041');
 begin
   update public.project_scan_schedules set last_job_id = '30000000-0000-4000-8000-000000000042'
    where id = '50000000-0000-4000-8000-000000000041';
   raise exception 'Tenant A pointed a schedule at tenant B job';
 exception when sqlstate '42501' then null;
 end;
 begin
   update public.project_scan_schedules set last_notified_job_id = '30000000-0000-4000-8000-000000000042'
    where id = '50000000-0000-4000-8000-000000000041';
   raise exception 'Tenant A pointed last_notified_job_id at tenant B job';
 exception when sqlstate '42501' then null;
 end;
 begin
   insert into public.project_scan_schedules(project_id,user_id) values
    ('20000000-0000-4000-8000-000000000042','10000000-0000-4000-8000-000000000041');
   raise exception 'Tenant A scheduled tenant B project';
 exception when sqlstate '42501' then null;
 end;
end $$;
rollback;
