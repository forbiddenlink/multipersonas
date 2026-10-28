# Repository Design & UX Coverage Tracker

Status key: `Inspected (Code)` | `Audited (Browser)` | `Planned` | `Updated` | `Verified` | `Intentionally Unchanged` | `Blocked`

## 1. Marketing & Acquisition Pages

| Route / Area | Repo Paths | Status | Findings (Summary) | Planned Changes | Verification Status | Blockers / Exclusions |
|---|---|---|---|---|---|---|
| `/` (Homepage) | `web/src/app/page.tsx`, `web/src/components/dossier/evidence-sheet.tsx`, `web/src/components/dossier/state-flow-trail.tsx`, `web/src/components/dossier/procedure-steps.tsx`, `web/src/components/dossier/sample-task-success.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| `/for-agencies` (Agency Landing & Founding Offer) | `web/src/app/for-agencies/page.tsx`, `web/src/components/waitlist-form.tsx`, `web/src/components/unlock-founding-access-button.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| `/pricing` (Plans, Ledger & Comparison) | `web/src/app/pricing/page.tsx`, `web/src/components/start-solo-plan-button.tsx`, `web/src/lib/plans.ts` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| `/grade` (Public Grader Entry) | `web/src/app/grade/page.tsx`, `web/src/components/grade-form.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| `/sample-report` (Public Sample Case File) | `web/src/app/sample-report/page.tsx`, `web/src/components/dossier/sample-cover-sheet.tsx`, `web/src/components/dossier/sample-findings.tsx`, `web/src/components/dossier/sample-coverage.tsx`, `web/src/components/dossier/report-furniture.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |

## 2. Dynamic Public Result & Capability Routes

| Route / Area | Repo Paths | Status | Findings (Summary) | Planned Changes | Verification Status | Blockers / Exclusions |
|---|---|---|---|---|---|---|
| `/grade/[token]` (Public Grade Result & Polling) | `web/src/app/grade/[token]/page.tsx`, `web/src/app/grade/[token]/not-found.tsx`, `web/src/components/dossier/grade-cover-sheet.tsx`, `web/src/components/dossier/grade-verdict-stamp.tsx`, `web/src/components/dossier/grade-finding-row.tsx`, `web/src/components/grade-fix-first.tsx`, `web/src/components/grade-poll.tsx`, `web/src/components/grade-share.tsx`, `web/src/components/grade-badge-embed.tsx`, `web/src/components/grade-next-steps.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | Live DB token lookup depends on local/seeded or sample state |
| `/r/[token]` (Shared Read-Only Report) | `web/src/app/r/[token]/page.tsx`, `web/src/app/r/[token]/not-found.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | Uses `ReportDocument` component |

## 3. Editorial, Documentation, Guides & Legal Pages (`ContentArticle` Family)

| Route / Area | Repo Paths | Status | Findings (Summary) | Planned Changes | Verification Status | Blockers / Exclusions |
|---|---|---|---|---|---|---|
| `/docs` (CLI Documentation) | `web/src/app/docs/page.tsx`, `web/src/components/dossier/content-article.tsx`, `web/src/components/dossier/content-prose.module.css`, `web/src/components/dossier/content-code-block.tsx`, `web/src/components/dossier/content-callout.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| `/guides` (Field Guides Index) | `web/src/app/guides/page.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| `/guides/wcag-checklist` | `web/src/app/guides/wcag-checklist/page.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| `/guides/common-accessibility-issues` | `web/src/app/guides/common-accessibility-issues/page.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| `/guides/accessibility-deadlines` | `web/src/app/guides/accessibility-deadlines/page.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| `/guides/screen-reader-testing` | `web/src/app/guides/screen-reader-testing/page.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| `/guides/ci-accessibility-gate` | `web/src/app/guides/ci-accessibility-gate/page.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| `/method` (Methodology & Experiments) | `web/src/app/method/page.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| `/changelog` | `web/src/app/changelog/page.tsx`, `web/src/lib/changelog.ts` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| `/accessibility` (Accessibility Statement) | `web/src/app/accessibility/page.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| `/security` (Security Architecture) | `web/src/app/security/page.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| `/privacy` (Privacy Policy) | `web/src/app/privacy/page.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| `/terms` (Terms of Service) | `web/src/app/terms/page.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |

## 4. Authentication & Account Recovery Flow (`AuthShell` Family)

| Route / Area | Repo Paths | Status | Findings (Summary) | Planned Changes | Verification Status | Blockers / Exclusions |
|---|---|---|---|---|---|---|
| `/auth/login` | `web/src/app/auth/login/page.tsx`, `web/src/app/auth/login/login-form.tsx`, `web/src/components/dossier/app-auth-shell.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| `/auth/signup` | `web/src/app/auth/signup/page.tsx`, `web/src/app/auth/signup/signup-form.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| `/auth/forgot-password` | `web/src/app/auth/forgot-password/page.tsx`, `web/src/app/auth/forgot-password/layout.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| `/auth/update-password` | `web/src/app/auth/update-password/page.tsx`, `web/src/app/auth/update-password/layout.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |

## 5. Signed-In Workspace (`(app)` Shell & Routes)

| Route / Area | Repo Paths | Status | Findings (Summary) | Planned Changes | Verification Status | Blockers / Exclusions |
|---|---|---|---|---|---|---|
| `(app)` Layout & Navigation | `web/src/app/(app)/layout.tsx`, `web/src/components/app-nav.tsx`, `web/src/app/(app)/loading.tsx`, `web/src/app/(app)/error.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | Requires authenticated session or test fixture |
| `/dashboard` | `web/src/app/(app)/dashboard/page.tsx`, `web/src/components/audit-form.tsx`, `web/src/components/audit-history.tsx`, `web/src/components/grade-history.tsx`, `web/src/components/claim-grade-form.tsx`, `web/src/components/forensic/first-run-checklist.tsx`, `web/src/components/forensic/first-run-empty.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | Requires authenticated session |
| `/projects` | `web/src/app/(app)/projects/page.tsx`, `web/src/components/project-offer.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | Requires authenticated session |
| `/projects/[id]` | `web/src/app/(app)/projects/[id]/page.tsx`, `web/src/app/(app)/projects/delete-project-form.tsx`, `web/src/components/run-diff.tsx`, `web/src/components/findings-trend.tsx`, `web/src/components/project-fix-first.tsx`, `web/src/components/paid-panels-note.tsx`, `web/src/components/task-evidence.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | Requires authenticated session |
| `/personas` | `web/src/app/(app)/personas/page.tsx`, `web/src/components/persona-card.tsx`, `web/src/components/persona-filter.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | Requires authenticated session |
| `/audits/[id]` | `web/src/app/(app)/audits/[id]/page.tsx`, `web/src/components/replay-theater.tsx`, `web/src/components/scan-coverage.tsx`, `web/src/app/(app)/audits/[id]/report-issue-copy.tsx`, `web/src/app/(app)/audits/[id]/report-issue-copy-all.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | Requires authenticated session |
| `/audits/[id]/report` | `web/src/app/(app)/audits/[id]/report/page.tsx`, `web/src/app/(app)/audits/[id]/report/report-document.tsx`, `web/src/app/(app)/audits/[id]/report/report.module.css`, `web/src/app/(app)/audits/[id]/report/conformance-table.tsx`, `web/src/app/(app)/audits/[id]/report/share-link-control.tsx`, `web/src/app/(app)/audits/[id]/report/export-button.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | Requires authenticated session |
| `/settings` | `web/src/app/(app)/settings/page.tsx`, `web/src/components/manage-billing-button.tsx`, `web/src/components/sign-out-button.tsx`, `web/src/components/checkout-plan-watcher.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | Requires authenticated session |
| `/waitlist` (Admin only) | `web/src/app/(app)/waitlist/page.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | Admin allowlist + service role key |

## 6. Shared Chrome, Primitives, & System States

| Route / Area | Repo Paths | Status | Findings (Summary) | Planned Changes | Verification Status | Blockers / Exclusions |
|---|---|---|---|---|---|---|
| Global Tokens & Typography | `web/src/app/globals.css`, `web/src/app/layout.tsx`, `web/DESIGN.md` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| Marketing Header & Mobile Nav | `web/src/components/site-header.tsx`, `web/src/components/header-actions.tsx`, `web/src/components/mobile-nav.tsx`, `web/src/components/theme-toggle.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| Marketing Footer | `web/src/components/site-footer.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| Forensic & Dossier Primitives | `web/src/components/dossier/exhibit-head.tsx`, `web/src/components/dossier/responsive-disclosure.tsx`, `web/src/components/forensic/severity-chip.tsx`, `web/src/components/forensic/wcag-citation.tsx`, `web/src/components/forensic/divider.tsx`, `web/src/components/forensic/empty-prompt.tsx`, `web/src/components/forensic/meter.tsx`, `web/src/components/forensic/wordmark.tsx`, `web/src/components/forensic/monogram.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| UI Primitives | `web/src/components/ui/button.tsx`, `web/src/components/ui/input.tsx`, `web/src/components/ui/label.tsx`, `web/src/components/ui/badge.tsx`, `web/src/components/ui/separator.tsx`, `web/src/components/ui/submit-button.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| Not Found & Error Boundaries | `web/src/app/not-found.tsx`, `web/src/app/error.tsx`, `web/src/app/global-error.tsx` | Inspected (Code) | Pending visual audit | Pending Phase 4 | Pending | None |
| Non-Web Packages (CLI & Worker) | `src/**`, `worker/**` | Inspected (Code) | CLI & background worker packages (non-web UI, except shared types/library imported by `web/`) | Intentionally unchanged unless shared types require read-only display helpers | Intentionally Unchanged | Out of web UI scope |
