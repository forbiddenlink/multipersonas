-- Enforce the per-plan project cap in the database.
--
-- The app checked the cap, then inserted (check-then-insert), so two concurrent
-- creates could both pass the check and exceed it. This BEFORE INSERT trigger
-- makes the cap atomic: it locks the owner's profiles row, which serializes
-- concurrent inserts for one user, then counts that user's projects.
--
-- Error contract (the app maps it in web/src/lib/projects.ts):
--   SQLSTATE 'PA001', message 'project_limit', detail 'limit=<n>'.
--
-- Limits mirror PROJECT_LIMITS in web/src/lib/entitlements.ts and a unit test
-- fails if the numbers below drift from it:
--   free 1, pro 5, team unlimited. An unknown plan is treated as free.
-- Only new inserts are refused. Owners already over the line keep every project.

create or replace function public.enforce_project_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_limit int;
begin
  -- FOR UPDATE on the owner's profile row is the per-user mutex. A concurrent
  -- insert for the same owner waits here until this transaction ends, then
  -- counts with a fresh snapshot that includes this transaction's row.
  select plan into v_plan from public.profiles where id = new.user_id for update;
  if not found then
    -- No profile row to lock (profiles are created on signup): serialize on the
    -- owner id instead so the cap still holds.
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  end if;

  v_limit := case v_plan
    when 'team' then null
    when 'pro' then 5
    else 1
  end;

  if v_limit is not null
     and (select count(*) from public.projects where user_id = new.user_id) >= v_limit then
    raise exception 'project_limit'
      using errcode = 'PA001', detail = 'limit=' || v_limit;
  end if;

  return new;
end;
$$;

-- Trigger-only function: never callable over the API.
revoke all on function public.enforce_project_cap() from public, anon, authenticated;

create trigger enforce_project_cap
  before insert on public.projects
  for each row execute function public.enforce_project_cap();
