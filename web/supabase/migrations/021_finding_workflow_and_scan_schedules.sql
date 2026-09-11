-- 021: issue workflow + scheduled project scans.
--
-- Findings were previously read-only evidence plus a dismissed flag. Agencies need to
-- assign each issue, track the remediation state, and leave handoff notes without
-- losing the original axe/persona evidence.

alter table public.findings
  add column if not exists status text not null default 'open'
    check (status in ('open', 'assigned', 'fixed', 'accepted-risk', 'false-positive')),
  add column if not exists owner text,
  add column if not exists notes text,
  add column if not exists resolved_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_findings_status on public.findings(status);
create index if not exists idx_findings_owner on public.findings(owner);

drop trigger if exists set_findings_updated_at on public.findings;
create trigger set_findings_updated_at
  before update on public.findings
  for each row execute function public.set_updated_at();

create table if not exists public.project_scan_schedules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  interval text not null default 'weekly' check (interval in ('weekly', 'monthly')),
  persona_ids text[] not null default array[
    'first-time-visitor',
    'keyboard-traversal',
    'mobile-slow-connection'
  ],
  enabled boolean not null default true,
  next_run_at timestamptz not null default now(),
  last_run_at timestamptz,
  last_job_id uuid references public.audit_jobs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id)
);

create index if not exists idx_project_scan_schedules_due
  on public.project_scan_schedules (enabled, next_run_at);
create index if not exists idx_project_scan_schedules_user
  on public.project_scan_schedules (user_id);

alter table public.project_scan_schedules enable row level security;

-- Guarded drop-then-create (matching 015's grader_scans_public_read convention) so this
-- migration stays replayable across a repeated `supabase db reset`, not just a first run.
drop policy if exists "Users can view own project scan schedules"
  on public.project_scan_schedules;
create policy "Users can view own project scan schedules"
  on public.project_scan_schedules for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own project scan schedules"
  on public.project_scan_schedules;
create policy "Users can create own project scan schedules"
  on public.project_scan_schedules for insert
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.projects
      where projects.id = project_scan_schedules.project_id
        and projects.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can update own project scan schedules"
  on public.project_scan_schedules;
create policy "Users can update own project scan schedules"
  on public.project_scan_schedules for update
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.projects
      where projects.id = project_scan_schedules.project_id
        and projects.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can delete own project scan schedules"
  on public.project_scan_schedules;
create policy "Users can delete own project scan schedules"
  on public.project_scan_schedules for delete
  using ((select auth.uid()) = user_id);

drop trigger if exists set_project_scan_schedules_updated_at on public.project_scan_schedules;
create trigger set_project_scan_schedules_updated_at
  before update on public.project_scan_schedules
  for each row execute function public.set_updated_at();

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
    insert into public.audit_jobs (user_id, project_id, url, persona_ids)
    values (v_schedule.user_id, v_schedule.project_id, v_schedule.url, v_schedule.persona_ids)
    returning id into v_job_id;

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
