# Report Export — VPAT-lite, verdicts-only, print-to-PDF

Frozen design spec. Snapshot as of 2026-07-28.
Written against: `feat/report-export` branched from `main` (post `4243b1e`).
Status: approved by Liz 2026-07-28 (design + WCAG citations in v1).

## Problem

Personaudit's buyer (agencies under ADA/EAA pressure) needs an exportable
compliance-evidence artifact to hand a client or a lawyer. Today an audit result renders
only on screen (`audits/[id]`). The **Report** (CONTEXT.md) is the billable handoff:
a VPAT-lite document built from **Verdicts only** — deterministic axe-core findings, never
persona opinion.

## Scope

- **Signed-in only.** Reports read `test_runs` + `findings` (owner-scoped via RLS). Anon
  audits have no `test_run` row, so no report — consistent with "billable."
- **Verdicts only.** `findings` filtered to `source = 'axe'`. Persona findings and opinions
  are excluded from the report body — the CONTEXT.md hard wall. Personas appear only as
  *scope context* in the methodology section ("navigated by N personas across M states"),
  never as findings.
- **Print-to-PDF**, no PDF library, no new infra. A print-optimized route + browser
  Save-as-PDF. (minimal-code-ladder rung 3: native platform feature over a new dep.)

Out of scope (v2+): server-rendered downloadable `.pdf` file; multi-run / project-level
reports; report branding/white-label; dismissed-finding handling in the report.

## Architecture

New standalone route, reusing the existing owner-scoped data path.

```
web/src/app/(app)/audits/[id]/report/
  page.tsx              server component — fetch run + axe findings, render report
  report.module.css     print + screen styles (@media print forces light/paper)
  export-button.tsx     'use client' — window.print()
web/src/lib/report.ts    server-only — buildReport(supabase, id) → ReportData | null
web/src/lib/wcag.ts      pure — wcagTagsToCriteria(tags: string[]) → { code, name }[]
```

- `(app)/*` is already auth-gated by `proxy.ts` (the Next 16 middleware). No new gate.
- `buildReport` selects the `test_run` by id (RLS scopes to owner → not-found/not-owned
  both yield null → 404) and its `findings` where `source = 'axe'`, ordered by severity.
- The report route renders its own minimal chrome (no `AppNav`/`SiteHeader`); print CSS
  hides everything but the document and forces a light palette regardless of theme.

### Data threading for WCAG citations (v1, approved)

The persisted `findings` table lacks a rule id and WCAG mapping. Both come from axe and
are honest to surface. Thread them:

1. **Engine** (`src/agent/axe-scan.ts`): capture `violation.tags` into a new optional
   `wcagTags?: string[]` on `Finding` (`src/agent/engine.ts`). `ruleId` already exists.
2. **Worker** (`worker/src/index.ts`): `toResponse` carries `ruleId` + `wcagTags` on axe
   findings; `persistHistory` inserts them into two new columns.
3. **Migration `010_findings_wcag.sql`**: add `rule_id text` and `wcag_tags text[]` to
   `public.findings` (both nullable — existing rows and persona findings stay null).
4. **types.ts** regenerated after apply.
5. **Report** maps `wcag_tags` → success criteria via `wcag.ts` (e.g. `wcag143` →
   `1.4.3 Contrast (Minimum)`). Findings with no tags show rule id only — never a
   fabricated SC.

`wcag.ts` covers the WCAG 2.0/2.1 A + AA success criteria that axe emits as `wcagNNN`
tags; unknown tags are dropped (not guessed).

## Report content (VPAT-lite sections)

1. **Header** — "Personaudit Accessibility Report"; site URL; audit date; report-generated
   date; report id (= `test_run.id`).
2. **Scope & methodology** — axe-core deterministic verdict rendered at each state the
   audit reached; scope = states reached, navigated by the listed personas (context only).
   **Disclaimer**: automated testing is not a substitute for testing with disabled people
   (→ [Fable](https://makeitfable.com/)). No "compliant" / "100%" language.
3. **Summary** — violation counts by severity (critical / serious / moderate / minor).
4. **Verdict table** — per axe finding: rule (title), WCAG SC (from tags, or "—"),
   severity, location(s) (`page_url`, or joined `seenOn` when present), recommendation.
5. **Footer** — personaudit.com; page numbers (CSS `@page`).

## Error / empty states

- Run not found or not owned → `notFound()` (404). RLS returns no row for either.
- Zero axe findings → honest empty state: "No accessibility violations were detected at
  the states this audit reached." NOT "100% compliant" / "fully accessible."

## Testing (TDD)

- `wcag.ts`: `wcagTagsToCriteria` maps known tags, drops unknown, dedupes, sorts by code.
- `report.ts` shape: verdicts-only — assert no `source='persona'` finding can enter
  `ReportData.findings` (the framing hard wall, mirrors `framing.test.ts`).
- Severity summary counts correct from a mixed finding set.
- Empty-state branch returns the honest empty verdict, not a compliance claim.
- Route smoke: renders header + table given `ReportData`; export button calls
  `window.print()`.

## Verification gate

web `lint + tsc + tests + build` green; engine `tsc + tests` green; worker `tsc` green.
Migration `010` applied to dev DB (validation zone — Liz sign-off before it counts as
shipped); advisors clean. Report is read-only over owner-scoped data — no new auth surface.
