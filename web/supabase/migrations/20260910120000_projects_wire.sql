-- 011: wire the Projects workspace into audits + profiles.
--
-- Context: `projects` (table + RLS) has existed since 001_initial_schema, but nothing
-- wrote to it yet — audit_jobs (the anon/authed scan queue) had no way to associate a
-- run with a project, and profiles had no place for an agency's display name. Both are
-- additive, nullable columns so existing rows need no backfill.

alter table public.audit_jobs
  add column if not exists project_id uuid references public.projects(id) on delete set null;
create index if not exists idx_audit_jobs_project_id on public.audit_jobs(project_id);

alter table public.profiles
  add column if not exists agency_name text;
