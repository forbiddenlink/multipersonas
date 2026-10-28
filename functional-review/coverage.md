# Functional coverage — 2026-09-29

Scope: current checkout, synthetic local data, public GET-only production checks, repository CI metadata. Status is per evidence below; an inventory entry is not a passed test. The pasted whole-app request governs the work; the HTML audit pack is reference material.

## Inventory

Packages: root CLI/engine; `web` Next.js application; `worker` persistent queue processor. `video` is an auxiliary marketing render, excluded from application behavior. Dependencies, generated output, historical experiments and private data are excluded from route inventory.

Roles/states: anonymous, signed-in free, pro, team, unauthenticated/expired session; queued/running/completed/failed jobs; empty and populated projects. Integrations: Supabase auth/database/storage, Stripe, Anthropic, Turnstile, Sentry/PostHog, Vercel/Railway.

### Page templates

- `/audits/[id]` — `web/src/app/(app)/audits/[id]/page.tsx`
- `/audits/[id]/report` — `web/src/app/(app)/audits/[id]/report/page.tsx`
- `/dashboard` — `web/src/app/(app)/dashboard/page.tsx`
- `/personas` — `web/src/app/(app)/personas/page.tsx`
- `/projects/[id]` — `web/src/app/(app)/projects/[id]/page.tsx`
- `/projects` — `web/src/app/(app)/projects/page.tsx`
- `/settings` — `web/src/app/(app)/settings/page.tsx`
- `/waitlist` — `web/src/app/(app)/waitlist/page.tsx`
- `/accessibility` — `web/src/app/accessibility/page.tsx`
- `/auth/forgot-password` — `web/src/app/auth/forgot-password/page.tsx`
- `/auth/login` — `web/src/app/auth/login/page.tsx`
- `/auth/signup` — `web/src/app/auth/signup/page.tsx`
- `/auth/update-password` — `web/src/app/auth/update-password/page.tsx`
- `/docs` — `web/src/app/docs/page.tsx`
- `/for-agencies` — `web/src/app/for-agencies/page.tsx`
- `/grade/[token]` — `web/src/app/grade/[token]/page.tsx`
- `/grade` — `web/src/app/grade/page.tsx`
- `/guides/accessibility-deadlines` — `web/src/app/guides/accessibility-deadlines/page.tsx`
- `/guides/ci-accessibility-gate` — `web/src/app/guides/ci-accessibility-gate/page.tsx`
- `/guides/common-accessibility-issues` — `web/src/app/guides/common-accessibility-issues/page.tsx`
- `/guides/screen-reader-testing` — `web/src/app/guides/screen-reader-testing/page.tsx`
- `/guides/wcag-checklist` — `web/src/app/guides/wcag-checklist/page.tsx`
- `/` — `web/src/app/page.tsx`
- `/pricing` — `web/src/app/pricing/page.tsx`
- `/privacy` — `web/src/app/privacy/page.tsx`
- `/sample-report` — `web/src/app/sample-report/page.tsx`
- `/terms` — `web/src/app/terms/page.tsx`

### API handlers and server actions

- `web/src/app/api/audit/[jobId]/route.ts`
- `web/src/app/api/audit/route.ts`
- `web/src/app/api/billing/portal/route.ts`
- `web/src/app/api/checkout/founding/route.ts`
- `web/src/app/api/checkout/solo/route.ts`
- `web/src/app/api/grade/[token]/badge/route.ts`
- `web/src/app/api/grade/[token]/route.ts`
- `web/src/app/api/grade/claim/route.ts`
- `web/src/app/api/grade/route.ts`
- `web/src/app/api/health/route.ts`
- `web/src/app/api/personas/route.ts`
- `web/src/app/api/schedules/run-due/route.ts`
- `web/src/app/api/stripe/webhook/route.ts`
- `web/src/app/api/waitlist/route.ts`
- `web/src/app/auth/callback/route.ts`
- `web/src/app/(app)/audits/[id]/actions.ts`
- `web/src/app/(app)/projects/actions.ts`
- `web/src/app/(app)/settings/actions.ts`
- `web/src/app/(app)/waitlist/actions.ts`

## Journey coverage

| Journey / expectations | Roles / prerequisites | Current evidence / status | Limits |
|---|---|---|---|
| Public pages, docs, pricing, guides, legal, sample report | Anonymous | Verified within crawl: 17 local public pages, 8 production smoke checks, local keyboard/print tests | 24 screenshots at 390/768/1440; 186 aborted RSC prefetch requests retained in evidence; taste/legal judgment excluded |
| Login, signup, recovery, callback, session refresh | Anonymous/account | Verified local sign-in and return-to behavior; auth unit tests pass | Live provider/email delivery not verified |
| Dashboard, audit history, personas, projects | Signed-in owner | Verified local browser and SQL suites with synthetic accounts | SQL tenant isolation passed; full account-state browser matrix not tested |
| Project create/edit/delete, saved tasks, schedules | Owned project; plan-specific allowances | Fixed and verified: project lifecycle and visible cap rejection; saved-task retest browser coverage; scheduling SQL coverage | Screenshot deletion and concurrent updates are separate failure paths |
| Hosted public grade: input → enqueue → scan → result/claim/badge | Anonymous; Turnstile when enabled | Verified local HTTP submission → actual worker → completed persisted report: 10 pages in 31 seconds | Local Turnstile disabled; host-process worker probe does not verify deployed proxy configuration |
| Paid persona audit, saved-task retest, report/replay/export | Eligible owner; model service for real run | Verified local synthetic saved-task browser flow, reports, and SQL ownership | No real LLM run or hosted behind-login claim |
| Settings/branding/billing portal | Signed-in user; team for branding | Inspected entitlement enforcement; unit tests pass | Stripe sandbox journey unavailable without dedicated test configuration |
| Checkout and webhook entitlement sync | Signed-in buyer; signed provider event | Inspected and unit-tested; simulated integration only | No real charges or billing records |
| Waitlist and admin waitlist actions | Visitor/operator | Existing tests and ownership guards inspected through suites | No real messages or real contact data |
| Health and async worker lifecycle | Service | Fixed health false-green, request deadline, error response; 8 route regressions pass | Empty queue cannot prove worker liveness |
| Worker packaging | Clean image build | Fixed and verified: correct build selector, shared Corepack cache, successful image build and offline non-root runtime imports | No deployed Railway configuration inspected |
| CLI scan/run/auth/generate, reports/baselines, SSRF/action guards | Local operator; model optional by command | 463 root tests pass after updates; 17 engine browser-condition tests passed earlier in this run | Real CLI session artifact and paid model integration not exercised |
| Tenant isolation, plans, queue/spend limits, scheduling, storage | Local synthetic database | Verified: all 10 SQL regression scripts passed after all migrations applied | Production schema/configuration not inspected |
| CI/build/dependencies | Developer/release | Verified lint/type/test/build, local E2E and bundle; final content-only check recorded below | No deploy authorized |

## Findings and repairs

- HEALTH-001: high, old queued work reported healthy. Reproduced incorrect 200; now 503 after 15 minutes; real query builder regression.
- HEALTH-002: medium, unbounded health dependency checks and escaping initialization exceptions. Shared 5-second deadline and safe failure response; hanging transport test.
- DEP-001: high advisory, fast-uri 3.1.6. Override and lockfile now patched 3.1.8; exploitability in this app not established.
- DEP-002: medium compatibility, installed SSR adapter requires supabase-js ^2.114.0. Aligned web/worker requirements; locked 2.117.2 satisfies SSR; full local auth/SQL/browser checks passed. Workspace Node >=22 declared.
- WORKER-001: high, Docker build selected obsolete multipersonas package and exited successfully without compiling excluded dist output. Corrected selector with fail-if-no-match; image import smoke passed. Offline test also caught a missing non-root pnpm cache; shared COREPACK_HOME fixed it.

## Evidence

Detailed initial evidence: `docs/audits/2026-09-29-production-readiness.md`. Current-run sanitized summaries will be recorded under `functional-review/evidence/`. Earlier reports are reference evidence only, not substitutes for current execution.

- PROJECT-001: medium, project cap and allowance-query failures were silently hidden by the page's error whitelist. Reproduced in three component cases and both browser viewports; fixed whitelist preserves arbitrary-URL rejection. Full create/edit/reload/cancel/delete journey now passes.
- CLAIM-001: medium, sample-report upgrade prompt implied paid hosted behind-login scanning. Corrected with the existing pricing-page CLI boundary; existing honesty suite expanded and passed.
- DOC-001: contributor install instructions named the obsolete package. Corrected package/binary names and workspace runtime requirements.

## Coverage comparison and exclusions

The 2026-09-28 report covered 27 page files and 14 API handlers plus the auth callback. This independently generated inventory matches that scope. Current functional verification adds a real queue-to-worker-to-report scan, offline image runtime imports, and a full isolated project lifecycle. Previous reports did not prove these paths.

The HTML pack modules used as prompts for inspection were repo-map, whole-app, forms, state, errorrecovery, importexport, data-integrity, auth-complete, supabase, stripe, billing-reconciliation, triggerjobs, lifecycle, dependencies, CI, accessibility, print-output, and release gates. Unrelated stacks, confidential systems, marketing campaigns, tax/legal opinions, and new infrastructure were intentionally excluded.

Billing and OAuth provider-console verification, real email delivery, model quality/cost under production conditions, backup restoration, load testing and production deployment remain partial or blocked on dedicated non-sensitive test configuration and/or separate authorization. No real payment, outreach, or deployment occurred. Admin waitlist browser testing was excluded to avoid real contact data; server authorization tests cover access boundaries. Self-service account deletion is not an existing shipped promise: the settings page offers a support request.

Two server-side closed-stream messages occurred during the passing browser suite. All recorded crawl request failures were aborted RSC prefetches; a direct client-navigation probe reached pricing with no page errors. No user-visible navigation defect was reproduced, and the raw observations were retained. This is not a claim of error-free logs.

## Continuation: recovery and contention

- HISTORY-001: saved-grade history read the scan projection directly, unlike the public result page which correctly uses the linked job. Reproduced incorrect queued status for running/failed/completed jobs and a database error displayed as empty history. Fixed with an owner-filtered relationship query and controlled error propagation. Six focused tests pass; the real local PostgREST query also verified owner isolation, authoritative failed status, and a completed grade letter. The public result page did not have the suspected endless-poll defect; no projection-sync migration was needed.
- RECOVERY-001: maintenance returned only terminal-failure counts, so retry-only recovery generated no recovery alert. The SQL regression returned 1 for two recovered jobs before the fix and 2 afterward. New additive migration restores accurate counts while preserving the no-refund policy for potentially consumed model reservations.
- WORKER-002: browser timeout did not bound queue, persistence, or screenshot-storage HTTP requests. Three stalled-request/body/upload regressions failed before; four cases pass after a shared client adds 30-second per-request deadlines and preserves caller cancellation. SDK-eligible read retries can take multiple request deadlines.
- Real local contention: 64 competing submissions against cap 8 admitted exactly 8; 32 same-caller submissions admitted exactly 5; 32 claims delivered 5 unique jobs; 16 concurrent recovery calls recovered 5 jobs exactly once; concurrent reclaims delivered 5 unique jobs. This tests database coordination, not end-to-end throughput under browser/model load. The guarded test now runs in CI.
- Full local dump/restore into a separate database preserved all 14 application tables with synthetic account/project/job/report data; all 11 SQL regressions passed against the restored database. Supabase system schemas required the local administrative restore role. Hosted backup policy, hosted recovery time, and object-file restoration remain unverified.
- Current suite totals: 467 root/worker tests, 420 web tests, 11 SQL scripts. The previous 26-browser-test evidence remains from the earlier pass; this continuation adds a real PostgREST helper probe rather than claiming a new browser run.
