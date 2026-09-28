# Personaudit website audit and repairs

Date: 2026-09-28. Branch: `codex/website-audit-repairs`.

Applied the attached audit prompt pack as reference material for a repair-and-verify pass. The user's request authorizes website improvements; it does not authorize production changes, customer-data access, real payments, or adopting every instruction in the document. No secrets, customer records, or restricted repositories were inspected. No deployment, cloud configuration, schema, pricing, or positioning changes were made.

## Scope and routing

The website's critical journeys are public grade submission, authentication and recovery, saved projects and task runs, reports, and paid access. Functionality and recovery came before polish. Selected pack modules: `repo-map`, `whole-app`, `forms`, `state`, `errorrecovery`, `crossbrowser`, `a11y`, `print-output`, `quality`, `testing`, `supabase`, `stripe`, `api`, `triggerjobs`, `ratelimit`, `abuse`, `seo`, `cicd`, `bundle-budget`, and `gate`. Overlapping questions were reviewed together rather than running repetitive prompts.

Actual package manifests: Next.js 16.3.5, React 19.2.8, TypeScript 6.0.3, pnpm 10.34.5. The Node 22.23.1 environment matches CI's configured major. Node 24.20.0 is also installed and was selected for an additional website runtime check. Three primary workspace packages: CLI/engine at root, Next.js website in `web/`, queue worker in `worker/`. `video/` is an auxiliary rendering project and was outside this website repair pass. Generated assets, dependencies, and retained research experiments were excluded from source inventory.

[Inventory](inventory.md): 27 page files, 14 API handlers plus the auth callback, and four server-action files. Static path inventory is broader than browser coverage.

## Reproduced and repaired

All eight findings have high confidence. New regression tests failed before their corresponding fixes, except the print issue, which was first reproduced directly in Chromium's print media emulation before adding its lasting regression test.

| ID | Severity | Location after repair | Observed failure and repair | Verification |
|---|---|---|---|---|
| AUTH-001 | High | `web/src/proxy.ts:20`, `web/src/proxy.ts:38` | New redirect responses discarded refreshed auth cookies. The installed Supabase SSR client's cache-protection headers were also ignored. Preserve the cookies and cache headers on pass-through and redirects. | Three regression cases cover authenticated redirect, unauthenticated redirect, and normal response; real NextResponse objects preserve cookie options and destination. |
| GRADE-001 | Medium | `web/src/app/api/grade/route.ts:108` | An optional account-linking exception after queue admission prevented returning the already-created grade token. Catch and report that exception while returning the queued token for recovery. | Auth failure and claim failure each return 202 and the original token, with one enqueue. Normal account linking still passes. |
| STATE-001 | Medium | `web/src/components/audit-form.tsx:39` | Syntactically valid but malformed saved jobs could crash the dashboard or poll a numeric job ID. Validate the saved job shape before use and fall back to the URL job. | Three malformed-storage cases recover through the URL without crashing; existing refresh/project tests pass. |
| STATE-002 | Medium | `web/src/components/audit-form.tsx:234`, `web/src/components/audit-form.tsx:291` | Strict Mode's effect cleanup let a superseded poll mark the active scan as timed out. Cancel deferred starts, ignore aborted outcomes, and register cleanup for newly submitted as well as resumed jobs. | Strict Mode regression keeps the active scanning state, without a spurious Check status button. Existing timeout/resume behavior passes. |
| PRINT-001 | Medium | `web/src/app/globals.css:450` | The global print rule hid every element on ordinary pages. `/docs` and `/guides/wcag-checklist` had no visible paragraphs or heading when printing. Restrict that hiding rule to documents containing a report, keeping selector specificity low enough for report content to remain visible. | Browser tests verify printable headings/body text on documentation, checklist, and sample report; sample-report navigation stays hidden. |
| FORM-001 | Medium | `web/src/components/grade-form.tsx:94` | A successful HTTP response without a grade token left the single-use Turnstile token available for reuse. Reset verification before allowing recovery. | Test verifies visible error, widget reset, disabled submit until fresh verification, and no navigation. |

| STATE-003 | High | `web/src/components/audit-form.tsx:157`; dashboard and project callers | Cached results used one browser-session key across accounts. Scope result and active-job keys to the authenticated user and remount when identity changes. Ignore legacy unscoped results on authenticated pages. | Regressions cover another account's cache, restoring own results, and writing/resetting only the current account's cache. |
| STATE-004 | Medium | `web/src/components/audit-form.tsx:110` | An inaccessible `?job=` link caused ten minutes of polling after 404. Treat 401/403/404 as terminal, clear the resume state, and explain how to recover. | Regression verifies error, enabled form, removed query, and no additional polling. |

The session handling was checked against the installed SSR client types and [Supabase’s current SSR guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs), which requires refreshed cookies and cache headers to survive replacement responses.

Independent final diff reviews found no remaining actionable issues. Review findings about the missing-token Turnstile reset and inaccessible-job polling were resolved, covered by regressions, and confirmed in read-only follow-up reviews.

## Evidence and coverage

| Area | Status | Evidence and limits |
|---|---|---|
| Public pages, internal navigation, metadata, mobile overflow | Verified within crawl scope | [Crawl](crawl/crawl.md), [raw results](crawl/crawl.json): 17 linked public pages, zero broken internal links, console/page errors, failed requests, broken images, or reported axe violations. No crawl issues recorded. Screenshots of home, agencies, pricing at 390/768/1440 pixels are local ignored artifacts. |
| Grade/auth forms, themes, reduced-motion preference | Verified rendered states; partial integration | [Browser states](browser-states.json): five routes in light/dark at 390px in Chromium and Firefox, all 200 with no horizontal overflow, page errors, or axe violations. Empty-grade and simulated 503 recovery pass in both themes/browsers. Reduced-motion preference was enabled, not a complete animation audit. No actual signup, email, provider login, or scan submission. |
| Keyboard and print | Verified selected behaviors | Six browser tests in `web/tests/e2e/public-accessibility.spec.ts`: three keyboard-scrollable code examples and three print views. |
| Auth/session, saved projects/tasks, ownership, paid gates, reports | Verified with local database and synthetic accounts | Desktop and mobile browser tests cover real sign-in, dashboard, projects, stored reports, saved tasks and retests. Eleven database scripts exercise ownership, entitlements, queue admission, scheduling, spend/reaping, and storage deletion. No production customer data accessed. |
| Stripe checkout/portal/webhooks | Inspected + existing unit verification | Code verifies session, profile/plan, webhook signature over raw body, current subscriptions for out-of-order events, and retryable persistence failures. No Stripe credentials, live billing records, real checkout, or provider configuration inspected. Billing reconciliation remains unverified. |
| Queue, rate limits, model spend, SSRF | Inspected + regression verification | Grade transaction, queue ownership, scheduled-job authorization, durable limiter/spend functions, worker timeout/reaper/cleanup, and engine security tests. No deployed worker health, network egress, queue backlog, or real LLM run exercised. |
| Database isolation and migrations | Verified locally | All migrations applied to an isolated disposable Supabase stack; all 11 SQL regression scripts passed. This proves tested local behavior, not deployed cloud configuration. No production schema changes. |
| SEO and product claims | Inspected + automated verification | Public metadata, sitemap/robots, and existing SEO/honesty/framing tests pass. No independent legal/compliance determination or search-console verification. |
| CI, static checks, production build, bundle | Verified locally | Results below. No repository settings, deployment, branch protection, or production-host change. |
| Dependency advisories | Verified after approval | The user authorized the pending advisory request in the follow-up. npm reports zero known advisories across 1,021 dependencies. This is a point-in-time advisory result, not a proof that every dependency is secure. |
| Design direction, sales copy, business/legal/tax strategy | Deferred by standing routing/scope | Your instructions route user-facing taste work to Claude. No rebrand, positioning rewrite, pricing change, business verdict, or jurisdictional advice. |
| Other stack prompts | N/A | No reason to run the pack's .NET, Power Platform, Craft/client-site, native mobile, browser-game, Drizzle/Prisma/better-auth or RAG tracks for this Next.js/Supabase website repair. Python exists in worker supervision, but this is not a Python web application. |

## Verification results

- Website baseline: 72 files, 388 tests passed.
- First-pass website repairs on Node 22 and Node 24: 73 files, 398 tests passed on each runtime. Final follow-up on Node 24: 402 tests passed across 73 files.
- Root engine/worker: 37 files, 463 tests passed; 19 conditional tests skipped in the default suite. Initial worker cleanup failures were sandbox `ps EPERM`, not product regressions; rerun with process inspection allowed passed.
- Final authenticated/public browser suite against disposable local Supabase: 24 passed across desktop Chromium and mobile Chromium, including the six public keyboard/print cases on both devices.
- All 11 database regression scripts passed after applying every migration to the disposable local stack.
- Disposable Supabase containers and data volumes removed after verification; generated browser login state deleted.
- npm dependency advisory check: zero known advisories across 1,021 dependencies.
- Engine browser-condition regression suite: 17 passed.
- Root lint, source typecheck, test typecheck, engine build, and worker typecheck passed.
- Website lint and TypeScript checks passed.
- Website production build on Node 22 passed with service integrations disabled. Initial font-download failure was restricted network access; approved rerun succeeded.
- Client bundle: 649.7 KB gzipped JS, under the existing 750.0 KB budget. This is a bundle gate, not a Core Web Vitals measurement.
- `git diff --check` passed.
- Final Node 24 production build, website lint and typecheck passed with local Supabase and external paid/analytics services disabled. Browser-run server logs included early-closed response streams during navigation; all 24 assertions passed, with no failing browser test.

## Remaining limits and next step

This pass improves eight confirmed failures and provides repeatable local evidence. It does not establish whole-product security, accessibility conformance, or production readiness. WebKit was not available. Real OAuth/email, payment delivery, production monitoring, backup restoration, and live egress behavior remain unverified. Authenticated database-backed journeys were verified locally with synthetic accounts. The default root suite also leaves two environment-specific tests skipped after running the separate 17-test browser suite. Production was not changed.

The repair diff is ready for review. Publishing remains a separate production action; no deployment was performed. Broad visual/copy changes remain routed to Claude by the standing project instructions.
