-- ABU-002 follow-up: scheduled scans must apply the lower trial cap too, otherwise a trial
-- account reserves up to the full per-caller cap through schedules. Synthetic data; rolls back.
begin;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000a01','trial-sched@example.invalid'),
 ('10000000-0000-4000-8000-000000000a02','paid-sched@example.invalid'),
 ('10000000-0000-4000-8000-000000000a03','lapsed-sched@example.invalid');
update public.profiles set plan = 'pro' where id in
 ('10000000-0000-4000-8000-000000000a01','10000000-0000-4000-8000-000000000a02','10000000-0000-4000-8000-000000000a03');
update public.profiles set trial_ends_at = now() + interval '5 days' where id = '10000000-0000-4000-8000-000000000a01';
update public.profiles set trial_ends_at = now() - interval '1 day' where id = '10000000-0000-4000-8000-000000000a03';
insert into public.projects(id,user_id,name,url) values
 ('20000000-0000-4000-8000-000000000a01','10000000-0000-4000-8000-000000000a01','T','https://example.invalid'),
 ('20000000-0000-4000-8000-000000000a02','10000000-0000-4000-8000-000000000a02','P','https://example.invalid'),
 ('20000000-0000-4000-8000-000000000a03','10000000-0000-4000-8000-000000000a03','L','https://example.invalid');
-- Four personas at 25 calls each = 100 calls: over the trial cap (75), under the normal (250).
insert into public.project_scan_schedules(project_id,user_id,persona_ids) values
 ('20000000-0000-4000-8000-000000000a01','10000000-0000-4000-8000-000000000a01', array['a','b','c','d']),
 ('20000000-0000-4000-8000-000000000a02','10000000-0000-4000-8000-000000000a02', array['a','b','c','d']),
 ('20000000-0000-4000-8000-000000000a03','10000000-0000-4000-8000-000000000a03', array['a','b','c','d']);

select * from public.enqueue_due_project_scan_schedules(25, 100000, 250, 25);
do $$ begin
 if exists (select 1 from public.audit_jobs where user_id = '10000000-0000-4000-8000-000000000a01') then
   raise exception 'A trialing user must not reserve above the trial cap through a schedule';
 end if;
 if exists (select 1 from public.usage_counters_by_caller where caller = '10000000-0000-4000-8000-000000000a01') then
   raise exception 'A refused trial schedule must reserve nothing';
 end if;
 if not exists (select 1 from public.audit_jobs where user_id = '10000000-0000-4000-8000-000000000a02' and reserved_calls = 100) then
   raise exception 'A paying user keeps the normal cap';
 end if;
 if not exists (select 1 from public.audit_jobs where user_id = '10000000-0000-4000-8000-000000000a03' and reserved_calls = 100) then
   raise exception 'A lapsed trial uses the normal cap';
 end if;
end $$;

-- Within the trial cap a trialing user still gets scheduled: three personas = 75.
update public.project_scan_schedules set persona_ids = array['a','b','c'], next_run_at = now() - interval '1 day'
 where user_id = '10000000-0000-4000-8000-000000000a01';
select * from public.enqueue_due_project_scan_schedules(25, 100000, 250, 25);
do $$ begin
 if not exists (select 1 from public.audit_jobs where user_id = '10000000-0000-4000-8000-000000000a01' and reserved_calls = 75) then
   raise exception 'A trialing user must still schedule within the trial cap';
 end if;
end $$;

-- An explicit trial cap argument is honoured, and never raises the normal cap.
update public.project_scan_schedules set next_run_at = now() - interval '1 day'
 where user_id = '10000000-0000-4000-8000-000000000a01';
delete from public.usage_counters_by_caller;
delete from public.audit_jobs;
select * from public.enqueue_due_project_scan_schedules(25, 100000, 250, 25, 50);
do $$ begin
 if exists (select 1 from public.audit_jobs where user_id = '10000000-0000-4000-8000-000000000a01') then
   raise exception 'Trial cap argument of 50 must refuse a 75-call schedule';
 end if;
end $$;

do $$ begin
 if has_function_privilege('anon', 'public.enqueue_due_project_scan_schedules(int,int,int,int,int)', 'execute')
    or has_function_privilege('authenticated', 'public.enqueue_due_project_scan_schedules(int,int,int,int,int)', 'execute') then
   raise exception 'Scheduler must stay service-only';
 end if;
 if not has_function_privilege('service_role', 'public.enqueue_due_project_scan_schedules(int,int,int,int,int)', 'execute') then
   raise exception 'service_role must keep execute';
 end if;
 if (select count(*) from pg_proc where proname = 'enqueue_due_project_scan_schedules') <> 1 then
   raise exception 'Exactly one scheduler overload must exist';
 end if;
end $$;
rollback;
