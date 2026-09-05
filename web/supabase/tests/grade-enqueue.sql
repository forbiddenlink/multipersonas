begin;
-- Isolated local test database only; this reset rolls back with the fixtures.
delete from public.audit_jobs where kind = 'grade' and status = 'queued';
delete from public.rate_limits where key in ('grade:synthetic-admission','grade:synthetic-rollback');
do $$ declare queued record; refused record; begin
 select * into queued from public.enqueue_grade_scan('https://example.invalid','grade:synthetic-admission',1,1,600);
 if queued.status <> 'queued' or queued.job_id is null or queued.token is null then raise exception 'Grade enqueue must return a job and token'; end if;
 if not exists (select 1 from public.grader_scans where job_id = queued.job_id and token = queued.token) then
   raise exception 'A runnable grade must have its result projection';
 end if;
 select * into refused from public.enqueue_grade_scan('https://example.invalid/second','grade:synthetic-admission',1,1,600);
 if refused.status <> 'busy' or refused.job_id is not null or refused.token is not null then
   raise exception 'Grade queue capacity must return busy without a job';
 end if;
 if (select count from public.rate_limits where key = 'grade:synthetic-admission') <> 1 then
   raise exception 'Busy admission must not consume the caller rate allowance';
 end if;
 if (select count(*) from public.audit_jobs where kind = 'grade' and status = 'queued') <> 1 then
   raise exception 'Rejected enqueues must not leave jobs';
 end if;
 update public.audit_jobs set status = 'completed' where id = queued.job_id;
 select * into refused from public.enqueue_grade_scan('https://example.invalid/third','grade:synthetic-admission',1,1,600);
 if refused.status <> 'rate_limited' or refused.job_id is not null or refused.token is not null then
   raise exception 'Rate-denied admission must not enqueue a job';
 end if;
 if exists (select 1 from public.audit_jobs where kind = 'grade' and status = 'queued') then
   raise exception 'Rate-denied admission must leave the queue unchanged';
 end if;
 begin
   perform public.enqueue_grade_scan(null,'grade:synthetic-rollback',1,1,600);
   raise exception 'Invalid job creation should fail';
 exception when not_null_violation then
   null;
 end;
 if exists (select 1 from public.rate_limits where key = 'grade:synthetic-rollback') then
   raise exception 'Failed job creation must roll back the caller allowance';
 end if;
 if has_function_privilege('anon','public.enqueue_grade_scan(text,text,integer,integer,integer)','execute') or
    has_function_privilege('authenticated','public.enqueue_grade_scan(text,text,integer,integer,integer)','execute') then
   raise exception 'Grade enqueue must be service-only';
 end if;
end $$;
rollback;
