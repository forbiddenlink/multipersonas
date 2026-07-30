-- Persist CSS selector targets on findings so web baseline/regression can use
-- the same defectKey identity as the CLI gate (ruleId + normalized selector).
-- Nullable: persona findings and pre-migration axe rows have no target.

alter table public.findings
  add column if not exists target text;

comment on column public.findings.target is
  'CSS path of the offending element (axe). Used with rule_id for stable defect identity across runs.';
