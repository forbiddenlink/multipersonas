-- Public accessibility grader: an anonymous, axe-only teaser scan.
--
-- Reuses the existing audit_jobs queue (worker claim/reaper/timeout machinery)
-- via a `kind` discriminator, and writes results to a PUBLIC-READABLE table keyed
-- by an unguessable token so results can be shared by link without auth.
--
-- audit_jobs already fits: user_id is nullable (anon grader has no owner);
-- persona_ids ('{}'), reserved_calls (0) and status ('queued') all have defaults,
-- so a grade insert needs none of them; claim_audit_job() filters only
-- status='queued', so it claims grade jobs unchanged.

alter table public.audit_jobs
  add column if not exists kind text not null default 'audit'
    check (kind in ('audit', 'grade'));

create table if not exists public.grader_scans (
  token uuid primary key default gen_random_uuid(),
  job_id uuid references public.audit_jobs(id) on delete set null,
  entry_url text not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed')),
  report jsonb,
  pages_visited text[] not null default '{}',
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_grader_scans_job on public.grader_scans (job_id);

alter table public.grader_scans enable row level security;

-- No SELECT/insert/update/delete policy: only the service role (worker + enqueue route,
-- scoped to the exact token — web/src/lib/grade.ts) reads or writes, and service role
-- bypasses RLS entirely. anon/authenticated get nothing at the RLS layer.
--
-- This migration originally created a public `using (true)` read policy here (shared by
-- unguessable token). Migration 016 (already applied to prod) dropped it after finding it
-- let ANY holder of the anon key enumerate every scan via the Data API, token or not — the
-- token was a convention, not a boundary. 016 never re-runs once this file is applied, so
-- this file must not recreate what 016 removed, or a pending apply reopens the hole 016
-- already closed. Do not add a public/anon SELECT policy on this table.
