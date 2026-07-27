-- 005: job queue for the worker split (docs/DEPLOYMENT.md blocker #1).
--
-- The audit route can no longer run Chromium inline (no browser on Vercel, exceeds the
-- serverless size/time limits). Instead it enqueues a job here and returns a jobId; a
-- persistent worker (worker/) claims queued jobs, runs the browser + engine, and writes
-- the result back. The client polls GET /api/audit/[jobId].

create table if not exists public.audit_jobs (
  id uuid primary key default gen_random_uuid(),
  -- Nullable: anonymous audits have no user. Owner reads via RLS; anon reads via the
  -- service-client poll endpoint keyed by the unguessable UUID (capability URL).
  user_id uuid references public.profiles(id) on delete cascade,
  url text not null,
  persona_ids text[] not null default '{}',
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed')),
  result jsonb,
  error text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists idx_audit_jobs_status_created
  on public.audit_jobs (status, created_at);
create index if not exists idx_audit_jobs_user_created
  on public.audit_jobs (user_id, created_at desc);

alter table public.audit_jobs enable row level security;

-- Signed-in owners can read their own jobs directly. There is deliberately no client
-- insert/update policy: the route enqueues and the worker updates, both via the service
-- client. Anonymous jobs are readable only through the service-backed poll endpoint.
create policy "Users can read own audit jobs" on public.audit_jobs
  for select using ((select auth.uid()) = user_id);

-- Atomically claim the oldest queued job (skip-locked so many workers don't collide).
-- Returns a null row when the queue is empty.
create or replace function public.claim_audit_job()
returns public.audit_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.audit_jobs;
begin
  update public.audit_jobs
    set status = 'running', started_at = now(), attempts = attempts + 1
    where id = (
      select id from public.audit_jobs
      where status = 'queued'
      order by created_at
      for update skip locked
      limit 1
    )
  returning * into v_job;
  return v_job;
end;
$$;

revoke all on function public.claim_audit_job() from anon, authenticated;
