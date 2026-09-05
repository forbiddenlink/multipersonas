-- Two synthetic users, no production records. Every fixture rolls back.
begin;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000003','tenant-a@example.invalid'),
 ('10000000-0000-4000-8000-000000000004','tenant-b@example.invalid');
insert into public.projects(id,user_id,name,url) values
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','A','https://example.invalid'),
 ('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000004','B','https://example.invalid');
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';
do $$ declare affected int; begin
 if (select count(*) from public.projects where id in ('20000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000004')) <> 1 then
   raise exception 'Tenant A must see only their own project';
 end if;
 update public.projects set name = 'Hijacked' where id = '20000000-0000-4000-8000-000000000004';
 get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'Tenant A must not update tenant B project'; end if;
 if has_function_privilege('authenticated','public.enqueue_audit_job(text,uuid,uuid,text[],text,integer,text)','execute') then
   raise exception 'Authenticated callers must not bypass checked queue admission';
 end if;
 if has_function_privilege('authenticated','public.enqueue_due_project_scan_schedules(integer,integer,integer,integer)','execute') then
   raise exception 'Authenticated callers must not invoke the scheduler';
 end if;
end $$;
rollback;
