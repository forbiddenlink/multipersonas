-- 014: Persona Replay Theater persistence (journey_steps + private `journeys` bucket).
--
-- Every persona run already produces an ordered walk (StepRecord[]) with a screenshot and
-- the persona's inner-monologue reasoning per step — the engine captures it, the worker
-- has always thrown it away with the tmp dir. This migration gives that walk a home so the
-- audit detail page can replay it: a scrubbable timeline of what a real user saw, thought,
-- and hit at each moment (Persona Replay Theater; design doc removed in the docs cleanup, see git log for docs/plans/2026-07-30-replay-theater-design.md).
--
-- Ownership + writes:
--   - Rows are scoped to a run's owner through test_runs.user_id (same shape as `findings`),
--     so a user sees only their own journeys. Deleting a run cascades its steps away.
--   - Only the worker (service_role, which bypasses RLS) writes — there is deliberately no
--     insert/update/delete policy, matching the deny-by-default of `waitlist`.
--
-- Privacy (load-bearing, see the design doc): worker scans run UNAUTHENTICATED (no
-- sessionFile), so persisted screenshots are of PUBLIC pages only. Behind-login capture
-- stays opt-in + private + short-retention when it lands; the bucket is private now so that
-- promise holds from day one. Signed, short-lived URLs are the only delivery path.
--
-- NOT applied by this change — Liz applies it via the Supabase dashboard SQL editor
-- (agent prod writes are classifier-blocked). Code degrades gracefully until then: the
-- worker's journey write is best-effort and the replay UI hides when no steps exist.

create table if not exists public.journey_steps (
  id uuid primary key default gen_random_uuid(),
  test_run_id uuid not null references public.test_runs(id) on delete cascade,
  persona_id text not null,
  step int not null,
  action text not null,
  detail text,
  -- The persona's own narration for this step. Navigation narration, never a compliance
  -- verdict (the axe/persona honesty wall). Nullable: the model does not always emit text.
  reasoning text,
  -- Whether this persona reached its goal on this run. Constant per (run, persona), stored
  -- on each step so a journey is self-contained (no join to the ephemeral audit_jobs row)
  -- — it drives the frustration ribbon's terminal relief-vs-rage.
  goal_completed boolean not null default false,
  page_url text,
  -- Path within the private `journeys` bucket, e.g. '<test_run_id>/<persona_id>/step-000.png'.
  -- Nullable so a step with no captured frame still records its reasoning + action.
  screenshot_path text,
  -- The moment in the journey (worker supplies the engine's step timestamp).
  ts timestamptz not null default now(),
  -- One row per (run, persona, step): makes the worker's write idempotent on retry.
  unique (test_run_id, persona_id, step)
);

create index if not exists idx_journey_steps_test_run_id on public.journey_steps(test_run_id);

alter table public.journey_steps enable row level security;

-- Read scoped through run ownership (mirrors findings' select policy). No write policy:
-- the worker writes with the service role, which bypasses RLS.
create policy "Users can view own journey steps" on public.journey_steps
  for select using (
    exists (
      select 1 from public.test_runs
      where test_runs.id = journey_steps.test_run_id
        and test_runs.user_id = (select auth.uid())
    )
  );

-- Private bucket for step screenshots. Not public: served only via short-lived signed URLs
-- minted server-side after the page has confirmed run ownership. Caps keep storage bounded.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('journeys', 'journeys', false, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

-- Defense in depth: even a direct authenticated read of an object is scoped to the owner
-- of the run whose id is the first path segment. Signed URLs remain the delivery path;
-- the worker uploads with the service role (RLS-exempt).
create policy "Owners can read own journey screenshots" on storage.objects
  for select to authenticated using (
    bucket_id = 'journeys'
    and exists (
      select 1 from public.test_runs tr
      where tr.user_id = (select auth.uid())
        and (storage.foldername(name))[1] = tr.id::text
    )
  );
