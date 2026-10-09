-- Null distinguishes older runs with unknown coverage from recorded empty checks.
alter table public.test_runs add column scan_coverage jsonb;
