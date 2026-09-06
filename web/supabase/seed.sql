-- Local-only seed, run automatically after migrations on `supabase db reset` / `start`.
-- Grant only the app operations needed by local fixtures. Blanket API-role grants
-- undo the column and server-only boundaries established by the migrations.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant select on public.profiles, public.projects, public.personas,
  public.test_runs, public.findings, public.journey_steps, public.audit_jobs,
  public.project_scan_schedules, public.audit_events to authenticated;
grant insert, update, delete on public.projects, public.personas,
  public.test_runs, public.findings, public.project_scan_schedules to authenticated;
grant update (full_name, avatar_url, agency_name) on public.profiles to authenticated;
grant usage, select on all sequences in schema public to authenticated, service_role;
