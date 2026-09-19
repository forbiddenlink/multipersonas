-- 010: carry the axe rule id + WCAG tags onto persisted findings, so the Report export
-- (design doc removed in the docs cleanup; see git log for
-- docs/superpowers/specs/2026-07-28-report-export-design.md) can cite WCAG success
-- criteria honestly instead of fabricating them.
--
-- Both columns are nullable: existing rows and every persona finding (source='persona')
-- stay null — only axe findings carry them, and only for runs recorded after this. The
-- worker (worker/src/index.ts) fills them from the engine's axe result; the report maps
-- wcag_tags -> success criteria via web/src/lib/wcag.ts, dropping any tag it can't map.

alter table public.findings
  add column if not exists rule_id text,
  add column if not exists wcag_tags text[];
