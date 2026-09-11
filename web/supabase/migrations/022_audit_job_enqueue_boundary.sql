-- 022: central audit job enqueue boundary + grade lifecycle cleanup.
--
-- audit_jobs owns queue lifecycle. grader_scans is only the public token/result
-- projection for the free grade surface.

create or replace function public.enqueue_audit_job(
  p_url text,
  p_user_id uuid default null,
  p_project_id uuid default null,
  p_persona_ids text[] default '{}',
  p_kind text default 'audit',
  p_reserved_calls int default 0,
  p_caller_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
begin
  if p_kind not in ('audit', 'grade') then
    raise exception 'invalid audit job kind: %', p_kind;
  end if;

  insert into public.audit_jobs (
    user_id,
    project_id,
    url,
    persona_ids,
    kind,
    reserved_calls,
    caller_key
  )
  values (
    p_user_id,
    p_project_id,
    p_url,
    coalesce(p_persona_ids, '{}'),
    p_kind,
    greatest(coalesce(p_reserved_calls, 0), 0),
    nullif(p_caller_key, '')
  )
  returning id into v_job_id;

  return v_job_id;
end;
$$;

revoke all on function public.enqueue_audit_job(text, uuid, uuid, text[], text, int, text)
  from public, anon, authenticated;
grant execute on function public.enqueue_audit_job(text, uuid, uuid, text[], text, int, text)
  to service_role;

create or replace function public.enqueue_due_project_scan_schedules(p_limit int default 10)
returns table(schedule_id uuid, job_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule record;
  v_job_id uuid;
begin
  for v_schedule in
    select
      s.id,
      s.project_id,
      s.user_id,
      s.interval,
      s.persona_ids,
      p.url
    from public.project_scan_schedules s
    join public.projects p on p.id = s.project_id
    where s.enabled = true
      and s.next_run_at <= now()
    order by s.next_run_at asc
    for update of s skip locked
    limit greatest(p_limit, 0)
  loop
    v_job_id := public.enqueue_audit_job(
      p_url := v_schedule.url,
      p_user_id := v_schedule.user_id,
      p_project_id := v_schedule.project_id,
      p_persona_ids := v_schedule.persona_ids,
      p_kind := 'audit'
    );

    update public.project_scan_schedules
      set last_run_at = now(),
          next_run_at = case v_schedule.interval
            when 'monthly' then now() + interval '1 month'
            else now() + interval '7 days'
          end,
          last_job_id = v_job_id
      where id = v_schedule.id;

    schedule_id := v_schedule.id;
    job_id := v_job_id;
    return next;
  end loop;
end;
$$;

revoke all on function public.enqueue_due_project_scan_schedules(int) from public, anon, authenticated;
grant execute on function public.enqueue_due_project_scan_schedules(int) to service_role;

create or replace function public.reap_stale_audit_jobs(
  p_timeout_seconds int default 900,
  p_max_attempts int default 2
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff timestamptz := now() - make_interval(secs => p_timeout_seconds);
  v_failed int := 0;
  v_dead record;
begin
  for v_dead in
    update public.audit_jobs
      set status = 'failed',
          error = 'Timed out while running the audit.',
          completed_at = now()
      where status = 'running'
        and started_at < v_cutoff
        and attempts >= p_max_attempts
      returning id, reserved_calls, caller_key
  loop
    v_failed := v_failed + 1;
    if v_dead.reserved_calls > 0 then
      if v_dead.caller_key is not null and length(v_dead.caller_key) > 0 then
        perform public.release_model_calls_scoped(v_dead.reserved_calls, v_dead.caller_key);
      else
        perform public.release_model_calls(v_dead.reserved_calls);
      end if;
    end if;
  end loop;

  update public.audit_jobs
    set status = 'queued', started_at = null
    where status = 'running'
      and started_at < v_cutoff
      and attempts < p_max_attempts;

  return v_failed;
end;
$$;

revoke all on function public.reap_stale_audit_jobs(int, int) from public, anon, authenticated;
grant execute on function public.reap_stale_audit_jobs(int, int) to service_role;
