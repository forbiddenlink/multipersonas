-- A runnable grade and its capability-token projection must commit together.
-- Serialize admission so concurrent anonymous requests cannot exceed the queue cap.
create function public.enqueue_grade_scan(
  p_url text,
  p_rate_key text,
  p_queue_cap int default 25,
  p_rate_max int default 5,
  p_rate_window_seconds int default 600
)
returns table(status text, job_id uuid, token uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
  v_token uuid;
begin
  if p_queue_cap is null or p_queue_cap < 1 then
    raise exception 'invalid grade queue capacity';
  end if;
  if p_rate_key is null or btrim(p_rate_key) = '' or
     p_rate_max is null or p_rate_max < 1 or
     p_rate_window_seconds is null or p_rate_window_seconds < 1 then
    raise exception 'invalid grade rate limit';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('public.enqueue_grade_scan', 0));
  if (select count(*) from public.audit_jobs j where j.kind = 'grade' and j.status = 'queued') >= p_queue_cap then
    return query select 'busy'::text, null::uuid, null::uuid;
    return;
  end if;
  -- Charge only after capacity is secured; any insert failure rolls this back too.
  if not public.consume_rate_limit(p_rate_key, p_rate_max, p_rate_window_seconds) then
    return query select 'rate_limited'::text, null::uuid, null::uuid;
    return;
  end if;
  v_job_id := public.enqueue_audit_job(p_url := p_url, p_kind := 'grade');
  insert into public.grader_scans(job_id, entry_url)
    values (v_job_id, p_url) returning grader_scans.token into v_token;
  return query select 'queued'::text, v_job_id, v_token;
end;
$$;
revoke all on function public.enqueue_grade_scan(text, text, int, int, int) from public, anon, authenticated;
grant execute on function public.enqueue_grade_scan(text, text, int, int, int) to service_role;
