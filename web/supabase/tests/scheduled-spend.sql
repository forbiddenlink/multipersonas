-- Run with psql -v ON_ERROR_STOP=1 against an isolated database with all migrations.
begin;
insert into auth.users (id, email) values ('10000000-0000-4000-8000-000000000001', 'schedule-test@example.invalid');
update public.profiles set plan = 'pro' where id = '10000000-0000-4000-8000-000000000001';
insert into public.projects (id,user_id,name,url) values (
  '20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Synthetic project','https://example.invalid'
);
insert into public.project_scan_schedules(project_id,user_id) values (
  '20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001'
);
select * from public.enqueue_due_project_scan_schedules(1);
do $$ begin
  if not exists (select 1 from public.audit_jobs where user_id = '10000000-0000-4000-8000-000000000001' and reserved_calls = 75 and caller_key = '10000000-0000-4000-8000-000000000001') then
    raise exception 'Scheduled audit must reserve 75 calls and carry its caller identity';
  end if;
  if not exists (select 1 from public.usage_counters_by_caller where caller = '10000000-0000-4000-8000-000000000001' and model_calls = 75) then
    raise exception 'Scheduled audit must debit the caller spend counter';
  end if;
end $$;
-- User-controlled persona arrays must not create unbounded worker concurrency.
update public.project_scan_schedules
  set next_run_at = now() - interval '1 day',
      persona_ids = array_fill('first-time-visitor'::text, array[100]);
do $$ begin
  if exists (select 1 from public.enqueue_due_project_scan_schedules(1, 100000, 100000)) then
    raise exception 'Oversized persona arrays must not enqueue a scheduled scan';
  end if;
end $$;
update public.project_scan_schedules set persona_ids = array['first-time-visitor'];

-- Downgrading must stop already-saved schedules, including ones inserted via REST.
update public.profiles set plan = 'free' where id = '10000000-0000-4000-8000-000000000001';
update public.project_scan_schedules set next_run_at = now() - interval '1 day';
do $$ begin
  if exists (select 1 from public.enqueue_due_project_scan_schedules(1)) then
    raise exception 'Free users must not enqueue scheduled persona scans';
  end if;
end $$;
rollback;
