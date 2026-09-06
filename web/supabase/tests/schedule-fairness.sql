begin;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000005','busy-caller@example.invalid'),
 ('10000000-0000-4000-8000-000000000006','eligible-caller@example.invalid');
update public.profiles set plan = 'pro' where id in ('10000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000006');
insert into public.projects(user_id,name,url)
 select '10000000-0000-4000-8000-000000000005','Synthetic ' || n,'https://example.invalid' from generate_series(1,25) n;
insert into public.projects(user_id,name,url) values ('10000000-0000-4000-8000-000000000006','Eligible','https://example.invalid');
insert into public.project_scan_schedules(project_id,user_id,next_run_at)
 select id,user_id,case when user_id = '10000000-0000-4000-8000-000000000005' then now() - interval '1 day' else now() end from public.projects
 where user_id in ('10000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000006');
select public.reserve_model_calls_scoped(250,5000,'10000000-0000-4000-8000-000000000005',250);
select * from public.enqueue_due_project_scan_schedules(25);
do $$ begin
 if not exists (select 1 from public.audit_jobs where user_id = '10000000-0000-4000-8000-000000000006') then
   raise exception 'Exhausted callers must not hide eligible schedules behind the batch limit';
 end if;
end $$;
rollback;

begin;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000007','mixed-cost-caller@example.invalid');
update public.profiles set plan = 'pro' where id = '10000000-0000-4000-8000-000000000007';
insert into public.projects(id,user_id,name,url) values
 ('20000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000007','Expensive','https://example.invalid'),
 ('20000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000007','Affordable','https://example.invalid');
insert into public.project_scan_schedules(project_id,user_id,next_run_at,persona_ids) values
 ('20000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000007',now() - interval '1 day',array['a','b','c','d','e']),
 ('20000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000007',now(),array['a']);
select public.reserve_model_calls_scoped(200,5000,'10000000-0000-4000-8000-000000000007',250);
select * from public.enqueue_due_project_scan_schedules(25);
do $$ begin
 if not exists (select 1 from public.audit_jobs where project_id = '20000000-0000-4000-8000-000000000008') then
   raise exception 'An individually unaffordable schedule must not hide a smaller affordable schedule';
 end if;
 if exists (select 1 from public.audit_jobs where project_id = '20000000-0000-4000-8000-000000000007') then
   raise exception 'The unaffordable schedule must remain unqueued';
 end if;
 if (select model_calls from public.usage_counters_by_caller
     where caller = '10000000-0000-4000-8000-000000000007'
       and day = (now() at time zone 'utc')::date) <> 225 then
   raise exception 'Reserve only the affordable scheduled job cost';
 end if;
end $$;
rollback;
