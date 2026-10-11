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
-- B's own run, to prove A cannot re-point or touch it.
insert into public.test_runs(id,user_id,project_id,url) values
 ('40000000-0000-4000-8000-000000000042','10000000-0000-4000-8000-000000000042','20000000-0000-4000-8000-000000000042','https://example.invalid');

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000041';
do $$ declare affected int; begin
 -- INSERT: own project and null project are allowed.
 insert into public.test_runs(id,user_id,project_id,url) values
  ('40000000-0000-4000-8000-000000000041','10000000-0000-4000-8000-000000000041','20000000-0000-4000-8000-000000000041','https://example.invalid');
 insert into public.test_runs(id,user_id,project_id,url) values
  ('40000000-0000-4000-8000-000000000043','10000000-0000-4000-8000-000000000041',null,'https://example.invalid');

 -- INSERT: B's project is refused.
 begin
   insert into public.test_runs(user_id,project_id,url) values
    ('10000000-0000-4000-8000-000000000041','20000000-0000-4000-8000-000000000042','https://example.invalid');
   raise exception 'Tenant A inserted a run pointing at tenant B project';
 exception when sqlstate '42501' then null;
 end;

 -- UPDATE: own project and null are allowed.
 update public.test_runs set project_id = null where id = '40000000-0000-4000-8000-000000000041';
 get diagnostics affected = row_count;
 if affected <> 1 then raise exception 'Tenant A could not null their own run project'; end if;
 update public.test_runs set project_id = '20000000-0000-4000-8000-000000000041' where id = '40000000-0000-4000-8000-000000000041';
 get diagnostics affected = row_count;
 if affected <> 1 then raise exception 'Tenant A could not set their own project on their own run'; end if;

 -- UPDATE: re-pointing an own run at B's project is refused.
 begin
   update public.test_runs set project_id = '20000000-0000-4000-8000-000000000042' where id = '40000000-0000-4000-8000-000000000041';
   raise exception 'Tenant A re-pointed their run at tenant B project';
 exception when sqlstate '42501' then null;
 end;

 -- UPDATE: B's run is invisible to A (zero rows).
 update public.test_runs set project_id = '20000000-0000-4000-8000-000000000041' where id = '40000000-0000-4000-8000-000000000042';
 get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'Tenant A updated tenant B run'; end if;

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
