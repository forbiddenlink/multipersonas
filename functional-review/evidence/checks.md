# Verification evidence — 2026-09-29

Checkout began at `7d27c005d9e832d7ff746b5a174151f30422260c`. All repairs remain uncommitted and undeployed. This record reports observed results, not a universal readiness certification.

| Check | Actual result | Scope / limitations |
|---|---|---|
| Root lint, source typecheck, test typecheck, build | Passed | Node 22.23.1 |
| Root/worker test suite | 37 files passed; 463 tests passed; 19 conditional tests skipped | Includes lifecycle, SSRF, report, crawler, task and worker regressions; process inspection enabled |
| Enforced browser conditions | 17 passed | Separate real-Chromium suite; run before the Supabase-only dependency alignment |
| Worker typecheck | Passed | Updated dependency graph |
| Website lint and typecheck | Passed | Node 24.20.0, final code |
| Website tests | 75 files / 415 tests passed | Includes 8 new health cases, 4 new project-feedback cases, 1 added honesty case |
| Website production build | Passed | Final code, synthetic Supabase configuration; no live data reads |
| Bundle gate | 650.2 KB gzip / 750 KB budget, passed | Aggregate emitted JS; not a first-load measurement |
| Gated desktop/mobile browser suite | 26 passed | Real local login, owned history/report, saved task/retest, project lifecycle, keyboard and print; before final one-sentence sample-report correction |
| Local database | All migrations applied; all 10 SQL scripts passed | Grade enqueue/claim, screenshot deletion, plan rights, reaper/spend, saved tasks, schedule fairness/spend, tenant isolation, waitlist boundary |
| Worker image | Built successfully; offline runtime imports passed as non-root | Actual image; no network in runtime smoke. Added same check to CI |
| Actual local worker delivery | HTTP 202 → completed report; 10 pages; 31 seconds | `grade-worker.json`; own public sample-report target, no LLM calls, local queue only |
| Public crawl | 17 pages; zero broken internal links, page/console errors, broken images, axe violations | `crawl/crawl.json`; GET-only; 24 screenshots for 8 pages, 3 widths |
| Client navigation | Homepage → pricing succeeded, no page errors | `client-navigation.json`; cancelled RSC prefetches retained |
| Deployed public smoke | All 8 checks passed | Deployed pre-repair version, not verification of local changes |
| Independent reviews | No unresolved blocking findings on reviewed code/config changes | Reviewer caught runtime documentation mismatch; workspace Node minimum then declared |
| Cleanup | No matching test containers, volumes, or images remained | Removed unique disposable stack/config and generated synthetic browser auth file |

## Failure-before / pass-after evidence

- Stale queued job health: returned 200 before; returns 503 after.
- Health initialization: exception escaped before; safe 503 after.
- Health timeout: no explicit deadline before; hanging synthetic HTTP requests abort and return 503 after.
- Project feedback: three missing-alert component failures and both viewport lifecycle failures before; 4 component tests and both lifecycle browser tests pass after.
- Worker packaging: `pnpm --filter multipersonas ...` reported no matched projects and exited zero. Build now selects `personaudit` with `--fail-if-no-match`.
- Non-root image: offline smoke failed while attempting to download pnpm. Shared Corepack cache made the same offline smoke pass.
- Sample-report product claim: the added honesty regression failed before the factual correction; all 12 claim checks pass after.

## Preserved observations

The crawl recorded 186 failed requests, all `net::ERR_ABORTED` RSC prefetch requests. A separate client-navigation check also saw cancelled prefetches but reached the intended page without page errors. The passing browser suite emitted two server-side “destination stream closed early” messages. No user-visible navigation failure was reproduced; these observations are not silently counted as clean logs.

Initial root test failures were sandbox-denied process inspection; rerunning with process inspection enabled passed. Initial live checks and font build failed under network restrictions; authorized network-enabled reruns passed. No failing assertions were weakened or skipped.

Raw temporary command logs are outside the repo. Stored evidence contains only public pages, aggregate results, and synthetic fixture outcomes. Browser session tokens and local database keys are not included.

## Still unverified

Real Stripe checkout/webhook/portal reconciliation; live OAuth/email configuration; deployed worker/proxy configuration; representative concurrent load; backup/restore and alert delivery; paid model cost/reliability under real usage; customer payment/retention evidence. Dedicated Personaudit Stripe sandbox identification has been requested. No live payment records, customer lists, or credentials were inspected.

## Continuation evidence

- Root/worker suite: 467 passed, 19 conditional skipped, 38 files passed. Web suite: 420 passed across 75 files. Lint and web/worker typechecks passed.
- New failing-before cases: three stalled worker requests (claim, upload, response body), four saved-history status/error cases, and a recovery count of 1 rather than 2. All passed after repairs; caller cancellation is preserved.
- All 11 SQL regression files passed both before and after a full local database restore. `local-restore.json` records the 14 matching application tables and scope. An initial ordinary-role restore failed on protected Supabase system function settings; using the local administrative role succeeded. No cloud restore was attempted.
- `queue-concurrency.json`: 64 submissions/8 accepted at capacity; 32 same-caller submissions/5 accepted; 32 claims/5 unique; 16 competing reapers/5 recovered; 32 reclaims/5 unique. No browser or model workload. Initial harness assertion incorrectly expected the rate counter to contain only accepted requests; corrected to its existing all-attempts semantics before the successful run.
- Real PostgREST query using the actual saved-history helper: synthetic owners see only their own grade; failed job overrides stale queued projection; completed report retains its letter.
- Independent continuation review found no actionable issues in the worker client, history query, SQL migration, concurrency regression, or CI wiring.
- The 30-second HTTP deadline is accelerated in unit tests; it remains active after response headers. It is per request, not a bound on an entire multi-request job.
- Final production website build passed with synthetic database configuration; aggregate emitted JavaScript was 694.4 KB gzip against the 750 KB budget. This is not first-load size. `git diff --check` passed.
- Removed the continuation's uniquely named local Supabase stack, volumes, restored database, synthetic dump, and fixture directory. No production migrations, deployment, payment, or messages were performed.

Remaining gaps above now exclude basic local database contention and local relational dump/restore. Representative production load, hosted PITR, storage object-file recovery, actual alert delivery, billing/provider configuration, and customer demand remain unverified.
