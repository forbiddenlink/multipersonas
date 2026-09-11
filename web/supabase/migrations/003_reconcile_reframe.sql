-- 003: reconcile the persistence schema with the repositioned product.
--
-- Context: migrations 001/002 predate the repositioning (docs/PLAN-2026-07-15).
-- Three changes bring the tables in line with what the engine actually produces:
--   1. test_runs.overall_score was a 0-100 composite that "was always 0 on any real
--      application" (see web/src/components/audit-results.tsx). It is replaced by the
--      real metric: a task-success fraction (achieved / total).
--   2. findings gains a hard `source` split ('axe' vs 'persona') so the honesty
--      constraint holds in stored data: axe = deterministic compliance verdict,
--      persona = LLM UX opinion. The two must never be blurred, in the UI or the DB.
--   3. test_runs.project_id becomes nullable so ad-hoc audits (the primary flow) can
--      be saved without first creating a project; projects become optional grouping.
--
-- Safe: all five tables are empty at apply time (0 rows), so no data backfill needed.

-- 1 + 3: test_runs
alter table public.test_runs drop column if exists overall_score;
alter table public.test_runs add column if not exists task_success_achieved integer;
alter table public.test_runs add column if not exists task_success_total integer;
alter table public.test_runs alter column project_id drop not null;

-- 2: findings source split (deterministic axe vs LLM opinion)
alter table public.findings
  add column if not exists source text not null default 'persona'
  check (source in ('axe', 'persona'));

-- History list reads newest-first per user
create index if not exists idx_test_runs_user_created
  on public.test_runs (user_id, created_at desc);
