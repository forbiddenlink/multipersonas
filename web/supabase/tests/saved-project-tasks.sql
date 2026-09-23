-- Synthetic fixtures only. Verify ownership, immutable enqueue snapshots, and schedules.
begin;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000091','task-a@example.invalid'),
 ('10000000-0000-4000-8000-000000000092','task-b@example.invalid');
update public.profiles set plan = 'pro' where id = '10000000-0000-4000-8000-000000000091';
insert into public.projects(id,user_id,name,url,task_definition) values
 ('20000000-0000-4000-8000-000000000091','10000000-0000-4000-8000-000000000091','Task test','https://example.invalid',
 '{"version":1,"goal":"Find contact information","successText":"Contact our team"}'),
 ('20000000-0000-4000-8000-000000000092','10000000-0000-4000-8000-000000000092','Other owner','https://example.invalid',null);

do $$ declare job uuid; legacy uuid; begin
 job := public.enqueue_audit_job('https://example.invalid','10000000-0000-4000-8000-000000000091','20000000-0000-4000-8000-000000000091',array['first-time-visitor']);
 update public.projects set task_definition = jsonb_set(task_definition,'{successText}','"Request a quote"')
 where id = '20000000-0000-4000-8000-000000000091';
 if (select task_definition->>'successText' from public.audit_jobs where id = job) is distinct from 'Contact our team' then
   raise exception 'Queued task snapshot changed with the project';
 end if;
 legacy := public.enqueue_audit_job('https://example.invalid');
 if (select task_definition from public.audit_jobs where id = legacy) is not null then
   raise exception 'Legacy job should retain built-in goals';
 end if;
 begin
   perform public.enqueue_audit_job('https://example.invalid','10000000-0000-4000-8000-000000000092','20000000-0000-4000-8000-000000000091');
   raise exception 'Cross-owner enqueue was accepted';
 exception when raise_exception then
   if sqlerrm <> 'Project not found' then raise; end if;
 end;
 begin
   update public.projects set task_definition = '{"version":1,"goal":"too short"}' where id = '20000000-0000-4000-8000-000000000091';
   raise exception 'Malformed task was accepted';
 exception when check_violation then null;
 end;
end $$;

-- Exercise the versioned constraint without changing the earlier queued snapshot.
do $$ declare candidate jsonb; begin
 update public.projects set task_definition = '{"version":2,"goal":"Find contact information","successText":"Request a quote","requireNewText":true,"expectedUrl":"https://example.invalid/thanks"}'
 where id = '20000000-0000-4000-8000-000000000091';
 foreach candidate in array array[
   '{"version":2,"goal":"Find contact information","successText":"Request a quote","requireNewText":false}'::jsonb,
   '{"version":2,"goal":"Find contact information","successText":"Request a quote","requireNewText":true,"expectedUrl":null}'::jsonb,
   '{"version":2,"goal":"Find contact information","successText":"Request a quote","requireNewText":"true"}'::jsonb,
   '{"version":2,"goal":"Find contact information","successText":"Request a quote","requireNewText":true,"expectedUrl":"javascript:alert(1)"}'::jsonb,
   '{"version":2,"goal":"Find contact information","successText":"Request a quote","requireNewText":true,"expectedUrl":"https://user:password@example.invalid"}'::jsonb,
   '{"version":2,"goal":"Find contact information","successText":"Request a quote","requireNewText":true,"unexpected":true}'::jsonb
 ] loop
   begin
     update public.projects set task_definition = candidate where id = '20000000-0000-4000-8000-000000000091';
     raise exception 'Invalid contextual task was accepted';
   exception when check_violation then null;
   end;
 end loop;
end $$;

insert into public.project_scan_schedules(user_id,project_id,interval,next_run_at,persona_ids)
values ('10000000-0000-4000-8000-000000000091','20000000-0000-4000-8000-000000000091','weekly',now()-interval '1 hour',array['first-time-visitor']);
do $$ declare queued record; begin
 select * into queued from public.enqueue_due_project_scan_schedules(1,5000,250,25);
 if queued.job_id is null then raise exception 'Schedule did not queue'; end if;
 if (select task_definition->>'successText' from public.audit_jobs where id = queued.job_id) is distinct from 'Request a quote' then
   raise exception 'Scheduled job did not capture the saved task';
 end if;
end $$;

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000092';
do $$ declare affected int; begin
 update public.projects set task_definition = null where id = '20000000-0000-4000-8000-000000000091';
 get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'Task editable across owners'; end if;
 if has_function_privilege('authenticated','public.enqueue_audit_job(text,uuid,uuid,text[],text,integer,text)','execute') then
   raise exception 'Task enqueue must remain service-only';
 end if;
end $$;
rollback;
