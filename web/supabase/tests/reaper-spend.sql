begin;
select public.reserve_model_calls_scoped(75, 5000, 'synthetic-reaper-caller', 250);
insert into public.audit_jobs(id,url,persona_ids,status,started_at,attempts,reserved_calls,caller_key)
values ('30000000-0000-4000-8000-000000000001','https://example.invalid',array['first-time-visitor'],'running',now() - interval '20 minutes',1,75,'synthetic-reaper-caller');
select public.reap_stale_audit_jobs(600,3);
do $$ begin
  if not exists (select 1 from public.audit_jobs where id = '30000000-0000-4000-8000-000000000001' and status = 'failed') then
    raise exception 'Model-spend jobs must not restart with an already-consumed reservation';
  end if;
  if not exists (select 1 from public.usage_counters_by_caller where caller = 'synthetic-reaper-caller' and model_calls = 75) then
    raise exception 'Reaping must retain potentially consumed model budget';
  end if;
end $$;
rollback;
