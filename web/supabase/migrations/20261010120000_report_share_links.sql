-- Per-report share links.
--
-- A report owner can mint an unguessable, expiring, revocable capability URL for one
-- completed run. Additive only: three nullable columns on test_runs, one format check,
-- one partial unique index, and four functions. No existing column, policy or grant
-- changes.
--
-- Read model: anon gets NO select policy on test_runs, findings or journey_steps, so a
-- token never widens what anon can list. The token is redeemed through SECURITY DEFINER
-- functions that take the token, validate it, and return an explicit column list. They
-- never `select *`, and never return user_id, emails, share_token, billing or other
-- internal fields.
--
-- Apply with `supabase db push` BEFORE merging the code that calls these functions.

alter table public.test_runs
  add column if not exists share_token text,
  add column if not exists share_expires_at timestamptz,
  add column if not exists share_revoked_at timestamptz;

-- 32 random bytes, base64url without padding = 43 characters. The app generates the
-- token with crypto randomness; this check refuses a short or hand-typed value even
-- though owners can update their own run rows under RLS.
alter table public.test_runs
  add constraint test_runs_share_token_format
  check (share_token is null or share_token ~ '^[A-Za-z0-9_-]{43}$');

create unique index if not exists test_runs_share_token_key
  on public.test_runs (share_token)
  where share_token is not null;

-- Internal helper: resolve a token to a run id, or null when the token is unknown,
-- revoked, expired, or the run is not completed. Not exposed to API roles; the public
-- functions below run as the owner and call it. A row with a token but a null expiry is
-- never served.
create or replace function public._shared_run_id(p_token text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select r.id
  from public.test_runs r
  where p_token is not null
    and r.share_token = p_token
    and r.share_revoked_at is null
    and r.share_expires_at is not null
    and r.share_expires_at > now()
    and r.status = 'completed'
$$;

revoke all on function public._shared_run_id(text) from public, anon, authenticated;

-- Run-level columns the shared report view needs. client_name comes from the linked
-- project; agency_name is returned only for the team plan, matching the signed-in
-- report's white-label entitlement (planAllowsReportBranding in web/src/lib/entitlements.ts).
create or replace function public.get_shared_report(p_token text)
returns table (
  run_id uuid,
  url text,
  created_at timestamptz,
  persona_ids text[],
  task_definition jsonb,
  task_outcomes jsonb,
  scan_coverage jsonb,
  client_name text,
  agency_name text
)
language sql
security definer
set search_path = public
stable
as $$
  select r.id, r.url, r.created_at, r.persona_ids, r.task_definition,
         r.task_outcomes, r.scan_coverage,
         pr.name,
         case when pf.plan = 'team' then pf.agency_name end
  from public.test_runs r
  -- Match the project's owner too: the existing test_runs policies do not stop an owner
  -- from pointing project_id at another user's project, and that name must not leak.
  left join public.projects pr on pr.id = r.project_id and pr.user_id = r.user_id
  left join public.profiles pf on pf.id = r.user_id
  where r.id = public._shared_run_id(p_token)
$$;

-- Axe verdict rows only (the report's compliance wall also lives in the app).
create or replace function public.get_shared_report_findings(p_token text)
returns table (
  id uuid,
  source text,
  severity text,
  title text,
  description text,
  recommendation text,
  rule_id text,
  wcag_tags text[],
  page_url text
)
language sql
security definer
set search_path = public
stable
as $$
  select f.id, f.source, f.severity, f.title, f.description, f.recommendation,
         f.rule_id, f.wcag_tags, f.page_url
  from public.findings f
  where f.test_run_id = public._shared_run_id(p_token)
    and f.source = 'axe'
  order by f.id
$$;

-- Journey rows reduced to the four columns the persona-impact table reads. No
-- reasoning text, no screenshot paths.
create or replace function public.get_shared_report_journey(p_token text)
returns table (
  persona_id text,
  goal_completed boolean,
  page_url text,
  step int
)
language sql
security definer
set search_path = public
stable
as $$
  select j.persona_id, j.goal_completed, j.page_url, j.step
  from public.journey_steps j
  where j.test_run_id = public._shared_run_id(p_token)
  order by j.id
$$;

revoke all on function public.get_shared_report(text) from public;
revoke all on function public.get_shared_report_findings(text) from public;
revoke all on function public.get_shared_report_journey(text) from public;
grant execute on function public.get_shared_report(text) to anon, authenticated;
grant execute on function public.get_shared_report_findings(text) to anon, authenticated;
grant execute on function public.get_shared_report_journey(text) to anon, authenticated;
