-- One saved task per project. Queue/history retain immutable task snapshots.
alter table public.projects add column task_definition jsonb;
alter table public.audit_jobs add column task_definition jsonb;
alter table public.test_runs add column task_definition jsonb;
alter table public.test_runs add column task_outcomes jsonb not null default '[]'::jsonb;

alter table public.projects add constraint projects_task_definition_valid check (
  task_definition is null or coalesce((
    jsonb_typeof(task_definition) = 'object'
    and task_definition->'version' = '1'::jsonb
    and jsonb_typeof(task_definition->'goal') = 'string'
    and char_length(btrim(task_definition->>'goal')) between 10 and 1000
    and jsonb_typeof(task_definition->'successText') = 'string'
    and char_length(btrim(task_definition->>'successText')) between 3 and 240
    and task_definition - array['version', 'goal', 'successText'] = '{}'::jsonb
  ), false)
);

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
  v_task jsonb;
begin
  if p_kind not in ('audit', 'grade') then
    raise exception 'invalid audit job kind: %', p_kind;
  end if;

  -- Capture once at enqueue, including scheduled jobs. Edits never rewrite old jobs.
  if p_project_id is not null then
    select task_definition into v_task from public.projects
      where id = p_project_id and user_id = p_user_id;
    if not found then
      raise exception 'Project not found';
    end if;
  end if;

  insert into public.audit_jobs (
    user_id,
    project_id,
    url,
    persona_ids,
    kind,
    reserved_calls,
    caller_key,
    task_definition
  )
  values (
    p_user_id,
    p_project_id,
    p_url,
    coalesce(p_persona_ids, '{}'),
    p_kind,
    greatest(coalesce(p_reserved_calls, 0), 0),
    nullif(p_caller_key, ''),
    case when p_kind = 'audit' then v_task else null end
  )
  returning id into v_job_id;

  return v_job_id;
end;
$$;

revoke all on function public.enqueue_audit_job(text, uuid, uuid, text[], text, int, text)
  from public, anon, authenticated;
grant execute on function public.enqueue_audit_job(text, uuid, uuid, text[], text, int, text)
  to service_role;

