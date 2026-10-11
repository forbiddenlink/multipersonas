-- Close a cross-tenant reference gap in test_runs (and the schedule job pointers).
--
-- Foreign-key checks bypass RLS, so a policy that only checks `user_id = auth.uid()` lets a
-- caller write ANOTHER user's project UUID into project_id (or another user's audit job
-- into a schedule's job pointers). The insert/update policies on test_runs checked only
-- user_id. Every legitimate path is unaffected: the worker inserts runs with the service
-- role (which bypasses RLS) after enqueue_audit_job verified project ownership, and the web
-- app only updates share_* columns on the caller's own runs.
--
-- Additive and replayable: policies are dropped and recreated by name. Policies apply to
-- new writes only; existing rows are not rewritten.

-- test_runs: project_id must be null (ad-hoc audit) or a project the caller owns.
drop policy if exists "Users can create own test runs" on public.test_runs;
create policy "Users can create own test runs" on public.test_runs for insert
  with check (
    (select auth.uid()) = user_id
    and (
      project_id is null
      or exists (
        select 1 from public.projects p
        where p.id = test_runs.project_id and p.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Users can update own test runs" on public.test_runs;
create policy "Users can update own test runs" on public.test_runs for update
  using (
    (select auth.uid()) = user_id
    and (
      project_id is null
      or exists (
        select 1 from public.projects p
        where p.id = test_runs.project_id and p.user_id = (select auth.uid())
      )
    )
  )
  with check (
    (select auth.uid()) = user_id
    and (
      project_id is null
      or exists (
        select 1 from public.projects p
        where p.id = test_runs.project_id and p.user_id = (select auth.uid())
      )
    )
  );

-- project_scan_schedules: project_id was already guarded (021). last_job_id and
-- last_notified_job_id reference audit_jobs with no ownership check; the notifier reads the
-- job named by last_job_id, so a caller could aim it at someone else's job. Only the
-- scheduler (security definer, job user_id = schedule user_id) legitimately sets them.
drop policy if exists "Users can create own project scan schedules" on public.project_scan_schedules;
create policy "Users can create own project scan schedules"
  on public.project_scan_schedules for insert
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.projects
      where projects.id = project_scan_schedules.project_id
        and projects.user_id = (select auth.uid())
    )
    and (
      last_job_id is null
      or exists (
        select 1 from public.audit_jobs j
        where j.id = project_scan_schedules.last_job_id and j.user_id = (select auth.uid())
      )
    )
    and (
      last_notified_job_id is null
      or exists (
        select 1 from public.audit_jobs j
        where j.id = project_scan_schedules.last_notified_job_id and j.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Users can update own project scan schedules" on public.project_scan_schedules;
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
    and (
      last_job_id is null
      or exists (
        select 1 from public.audit_jobs j
        where j.id = project_scan_schedules.last_job_id and j.user_id = (select auth.uid())
      )
    )
    and (
      last_notified_job_id is null
      or exists (
        select 1 from public.audit_jobs j
        where j.id = project_scan_schedules.last_notified_job_id and j.user_id = (select auth.uid())
      )
    )
  );
