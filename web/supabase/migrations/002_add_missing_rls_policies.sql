-- Add missing RLS policies for test_runs and findings

-- test_runs: allow users to update and delete their own runs
create policy "Users can update own test runs"
  on public.test_runs for update
  using ((select auth.uid()) = user_id);

create policy "Users can delete own test runs"
  on public.test_runs for delete
  using ((select auth.uid()) = user_id);

-- findings: allow insert/delete scoped through test_runs ownership
create policy "Users can create findings for own test runs"
  on public.findings for insert
  with check (
    exists (
      select 1 from public.test_runs
      where test_runs.id = findings.test_run_id
      and test_runs.user_id = (select auth.uid())
    )
  );

create policy "Users can delete own findings"
  on public.findings for delete
  using (
    exists (
      select 1 from public.test_runs
      where test_runs.id = findings.test_run_id
      and test_runs.user_id = (select auth.uid())
    )
  );

-- Optimize existing policies: use (select auth.uid()) for performance
-- (These replace the originals which used auth.uid() directly)

-- profiles
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select using ((select auth.uid()) = id);
create policy "Users can update own profile" on public.profiles for update using ((select auth.uid()) = id);

-- projects
drop policy if exists "Users can view own projects" on public.projects;
drop policy if exists "Users can create own projects" on public.projects;
drop policy if exists "Users can update own projects" on public.projects;
drop policy if exists "Users can delete own projects" on public.projects;
create policy "Users can view own projects" on public.projects for select using ((select auth.uid()) = user_id);
create policy "Users can create own projects" on public.projects for insert with check ((select auth.uid()) = user_id);
create policy "Users can update own projects" on public.projects for update using ((select auth.uid()) = user_id);
create policy "Users can delete own projects" on public.projects for delete using ((select auth.uid()) = user_id);

-- personas
drop policy if exists "Users can view own personas" on public.personas;
drop policy if exists "Users can create own personas" on public.personas;
drop policy if exists "Users can update own personas" on public.personas;
drop policy if exists "Users can delete own personas" on public.personas;
create policy "Users can view own personas" on public.personas for select using ((select auth.uid()) = user_id);
create policy "Users can create own personas" on public.personas for insert with check ((select auth.uid()) = user_id);
create policy "Users can update own personas" on public.personas for update using ((select auth.uid()) = user_id);
create policy "Users can delete own personas" on public.personas for delete using ((select auth.uid()) = user_id);

-- test_runs (select + insert)
drop policy if exists "Users can view own test runs" on public.test_runs;
drop policy if exists "Users can create own test runs" on public.test_runs;
create policy "Users can view own test runs" on public.test_runs for select using ((select auth.uid()) = user_id);
create policy "Users can create own test runs" on public.test_runs for insert with check ((select auth.uid()) = user_id);

-- findings (select + update — already use subquery pattern, recreate with select wrapper)
drop policy if exists "Users can view own findings" on public.findings;
drop policy if exists "Users can update own findings" on public.findings;
create policy "Users can view own findings" on public.findings for select using (
  exists (select 1 from public.test_runs where test_runs.id = findings.test_run_id and test_runs.user_id = (select auth.uid()))
);
create policy "Users can update own findings" on public.findings for update using (
  exists (select 1 from public.test_runs where test_runs.id = findings.test_run_id and test_runs.user_id = (select auth.uid()))
);
