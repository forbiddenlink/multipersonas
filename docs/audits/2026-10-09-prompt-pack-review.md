# Prompt-pack review — 2026-10-09

Source: `/Volumes/LizsDisk/_reference/audit-prompt-pack.html`, pack v5.1 (2026-09-28).

All 160 full prompt bodies across 12 phases were read, including the shared execution contract. This is a targeted repository review and repair, not a claim that all 160 audits were executed or that the product is production-ready. Document instructions were treated as reference material; the user's request and repository boundaries governed actions.

## Scope and approach

Applied the pack's evidence, incomplete-coverage, recovery, persistence, accessibility, SSRF, and adversarial-review guidance to the CLI scan, public grader, background worker, saved report, and scheduled-notification paths. Findings were checked against current code and regression cases. Four read-only reviewers covered engine, web, boundaries, and skeptical validation under the review-swarm workflow. Prior reports were leads, not proof.

No production data, secrets, payment operations, emails, deployments, or cloud changes were accessed or performed. No disability simulation was added. Accessibility remains deterministic axe evidence; persona output remains UX opinion and task-success evidence. Behind-login remains CLI-only. UI redesign and commercial copy were not part of these repairs.

## Repairs

| Problem reproduced | Repair and evidence |
| --- | --- |
| An invalid crawl budget or a failed later page could yield incomplete clean evidence. | `src/crawler/crawl.ts:76`: reject non-positive/non-integral budgets, fail on navigation errors and HTTP 4xx/5xx, always close the browser. Tests cover entry/later failures and a valid budget leaving queued pages in skipped evidence. |
| The sixth affected element was discarded, so a newly introduced defect could evade a baseline gate. | `src/agent/axe-scan.ts:46`: retain every affected node. A regression test baselines five nodes, adds a sixth, and verifies the CI gate detects it. WCAG 2.2 A/AA tags are explicitly enabled and tested. |
| Crawler stripped hash routes; canonical entry redirects prevented following the site's actual origin. | `src/crawler/crawl.ts:91`: preserve `#/` and `#!/` routes, discard document anchors, adopt the first settled origin once. Grader adopts the first successfully evaluated page's origin/path. Tests include canonical redirect, same-origin checkout, excluded unrelated origin, and hash routes. |
| Citation parsing split commas inside a URL into multiple locations. | `web/src/lib/report.ts`: split the producer's comma-space delimiter. Tests preserve an `ids=1,2` URL and still split joined locations. This preserves the existing string format; it does not add structured location storage. |
| A clean report presented the number of finding locations as crawl coverage, claiming zero states. | `web/src/lib/report-summary.ts`: state that automated checks found no violations in the states checked, without inventing a page count. Regression covers zero finding locations. |
| Temporary missing recipient/project/summary consumed the notification claim, preventing retry. Provider errors could look like missing data. | `web/src/lib/scan-notify.ts:73`: release unused claims, throw adapter errors, and check release errors. Stateful retry tests verify a later invocation can send after data returns. No real email sent. |
| The first 200 already-notified schedules prevented later schedules from being considered. | `web/src/lib/scan-notify.ts:137`: paginate in stable order until enough pending candidates or exhaustion. An actual Supabase SDK client with synthetic fetch responses verifies schedule 201 is reached. Production query performance was not measured. |
| Worker proxy protection depended on ambient environment flags. | `worker/entrypoint.sh` supplies the local proxy default and forces required-proxy mode; both worker execution entry paths force required-proxy mode. Shell stubs and a direct scan subprocess verify refusal without a proxy, without launching Chromium. This establishes safe source defaults, not the current deployed Railway configuration. |
| Failed findings/completion persistence left audit history marked running. | `worker/src/job-write.ts:30`: save findings before completion, mark a running row failed on errors, preserve the original error, and report both errors if cleanup also fails. Tests exercise findings failure, completion failure, success, and failed cleanup. A database outage can still prevent cleanup; this repair reports that failure. |

## Follow-up repairs completed locally

### Checkout replay — repaired locally; rollout pending

The previous checkout path created a new Stripe Checkout Session on each request while the profile remained free, allowing multiple chargeable sessions before payment webhooks updated access. `web/src/lib/checkout.ts` now atomically reserves one attempt per account across paid tiers, persists frozen Stripe parameters, reuses an open session, and uses a stable attempt-based idempotency key.

A reservation is released only after Stripe confirms expiry or a completed session's subscription is `canceled` or `incomplete_expired`. A known completed active subscription blocks another checkout even during webhook lag. Ambiguous create/save failures preserve the same key and parameters; an unknown outcome older than 23 hours or within 31 minutes of fixed expiry requires reconciliation and cannot create a fresh charge. Signed completion, expiry, async-success, and async-failure webhooks fill an unknown session ID only for matching attempt/user metadata and a still-null stored ID; subscription fulfillment is unchanged.

`web/supabase/migrations/20261009140804_checkout_attempt_reservations.sql` is local and unapplied. A disposable PostgreSQL fixture verified concurrent unique-constraint reservation behavior and public-role access denial. Apply it before the web rollout and verify the live webhook event subscriptions, including expiry and async failure. Preexisting live Checkout Sessions from the old path must be expired or reconciled before enabling the new path; the repair does not retroactively protect them. No real purchases, production migration, cloud configuration verification, or deployment was performed.

### Persona scan coverage failures — repaired locally; rollout pending

The previous persona path dropped post-action axe failure details and kept agent execution failures only in progress output. `src/agent/engine.ts` and `src/agent/orchestrator.ts` now retain optional `scanCoverage`: `checks` with `url`, `step`, `status` (`scanned` or `failed`), and optional `error`, plus `executionFailures` with `url` and `error`. Paid UX execution continues after a failed axe check.

Raw results, worker persistence, saved history, reports, CSV metadata, and copied Markdown retain coverage failures instead of presenting missing defects as complete clean evidence. `web/supabase/migrations/20261009140805_persona_scan_coverage.sql` adds nullable storage: legacy `null` means unknown coverage. It is local and unapplied; apply both follow-up migrations before rolling out the updated web app and worker. No deployed output or production database verification was performed.

## Applicability and coverage limits

- Setup/evidence/output: used for authority, evidence, coverage, deduplication, and second review. No instructions from the HTML were executed automatically.
- Product quality: applied only to factual report output and URL evidence. No complete browser/device/accessibility-manual/visual/UX audit was executed.
- Code health and technical depth: inspected scan correctness, error recovery, persistence, worker execution, notification lifecycle, and associated tests. No complete dependency, load, backup-restore, performance, database, AI-evaluation, or public-API audit was executed.
- Stack: selected existing Supabase, worker, Stripe, and email paths were inspected. Two follow-up migrations were added and tested locally; neither was applied to production. No provider provisioning was performed. Supabase range docs were consulted; the changelog fetch was unavailable. Adapter behavior was verified against the installed SDK with synthetic responses.
- Security: selected SSRF/proxy and failed-evidence paths were inspected. No full penetration test, live RLS/multitenancy verification, secret scan, legal, tax, privacy, or compliance certification.
- Viability, strategy, pre/post-launch: read for applicability and to preserve honest product claims. No market-demand, conversion, acquisition, revenue, infrastructure, or post-launch claims verified.
- Unsupported/unrelated stacks (Python, .NET, Power Platform, MSAL, mobile, game/WebGL, etc.) were excluded. Confidential CRC/client-site work was excluded throughout.

## Full reading inventory

Every ID below was read in full. Inventory denotes reading, not execution or a passing audit.

- **Setup (5)**: `ctx`, `order`, `evidence-contract`, `workflow`, `repo-map`.
- **Viability & fit (5)**: `viability`, `sellable`, `makesellable`, `demand-validation`, `dd-readiness`.
- **Product quality (20)**: `ux`, `design`, `design-research`, `writing`, `content`, `conversion`, `forms`, `crossbrowser`, `i18n`, `datapitfalls`, `darkmode`, `motion`, `onboarding`, `microcopy`, `paywall-ux`, `whole-app`, `design-second-pass`, `modern-css`, `print-output`, `distinctiveness`.
- **Code health (12)**: `structure`, `organizing-model`, `docs`, `deps`, `quality`, `testing`, `cicd`, `featureflags`, `migrations`, `agent-code-trust`, `monorepo`, `componentdocs`.
- **Stack-specific (22)**: `supabase`, `stripe`, `billing-reconciliation`, `envvars`, `drizzle`, `betterauth`, `secretmgmt`, `triggerjobs`, `multiproviderai`, `tailwindv4`, `msal`, `prisma`, `resend`, `upstash`, `vercel-config`, `sentry-setup`, `auth-complete`, `dotnet`, `power-platform`, `remotion`, `game-webgl`, `mobile-app`.
- **Technical depth (33)**: `func`, `state`, `timekeeping`, `errorrecovery`, `serveractions`, `perf`, `caching`, `api`, `public-api`, `ratelimit`, `pwa`, `ai-features`, `ai-evals`, `rag-quality`, `email`, `webhooks`, `backup`, `abuse`, `lifecycle`, `loadtest`, `db-performance`, `bundle-budget`, `rsc-streaming`, `otel-logging`, `edge-runtime`, `typesafety`, `agent-durability`, `data-integrity`, `realtime`, `importexport`, `email-render`, `deploy-skew`, `hydration`.
- **Security & compliance (22)**: `sec`, `a11y`, `gdpr`, `multitenancy`, `legaldocs`, `tax-compliance`, `moderation`, `dast`, `secrets-scan`, `ssrf`, `uploads`, `ai-redteam`, `mcp-security`, `voice-realtime`, `csp-report`, `third-party-scripts`, `gha-workflow-security`, `breach-response`, `audit-logging`, `ai-provenance`, `a11y-widgets`, `admin-tools`.
- **Pre-launch (10)**: `seo`, `webstandards`, `obs`, `deploy`, `incident`, `statuspage`, `dns`, `support`, `launchday`, `analytics-integrity`.
- **Strategy (18)**: `competitive`, `research`, `designsystem`, `dx`, `busfactor`, `costaudit`, `supplychain`, `agentready`, `experiments`, `growth`, `channel-fit`, `paid-acquisition`, `launch-marketing`, `organic-authority`, `social-proof`, `pricing`, `changelog`, `agent-commerce`.
- **Output (8)**: `action`, `voice`, `pw`, `visualreg`, `gate`, `delta`, `dedup`, `rollback`.
- **Post-launch (2)**: `postlaunch`, `postlaunch-retro`.
- **Python (FastAPI / Django) (3)**: `python-stack`, `python-api`, `python-security`.

## Verification

The earlier repair pass was verified with Node v22.23.1 (these counts precede the checkout-reservation and persona-coverage follow-up):

- Root full suite: 515 passed, 19 skipped (38 passing files; 2 skipped files).
- Web full suite: 801 passed across 137 files.
- Root and web lint: passed.
- Root source, root test, web, and worker type checks: passed.
- Root build: passed.
- Final changed-test lint, test type check, and whitespace check: passed.
- A first full root run hit the new worker subprocess test's 5-second default timeout under concurrent check load. The test now awaits the subprocess asynchronously, with a 20-second child deadline and 25-second test deadline. The full rerun passed.
- Web production build: passed after retrying with network access for Google Fonts. The sandbox attempt was interrupted after DNS failures. The successful build compiled, typechecked, and generated all 40 static pages.
- Bundle budget: passed, 730.8 KB gzipped JavaScript against a 750 KB budget.

Existing web-suite warnings about Vite config module loading and jsdom document navigation were also present before these changes. Local tests use synthetic data and browser/provider doubles where indicated; no live end-to-end crawl, live billing test, deployed worker check, or production database verification was performed.

### Follow-up verification — checkout reservations and durable coverage

- Root full suite: 522 passed, 19 skipped.
- Web full suite: 842 passed across 137 files with `--maxWorkers=4`.
- Root/web lint, source/test/web type checks, and worker type check: passed. The worker's old ambient engine declaration initially omitted the new fields; it now imports the engine coverage type and its check passes.
- Root build and web production build: passed. Web compiled, typechecked, and generated all 40 static pages.
- Bundle budget: passed, 731.9 KB gzipped JavaScript against the 750 KB budget.
- Disposable PostgreSQL 17 fixture: both migrations applied; concurrent reservations yielded exactly one winner; anonymous/authenticated roles could not read billing state; legacy coverage remained null. The local database was stopped and removed.
- Checkout/webhook regressions: repeated and concurrent requests, immutable retry parameters, lost provider responses, lost database writes, unknown-outcome cutoff, expired sessions, delayed fulfillment, terminal/nonterminal subscriptions, cross-plan reservations, storage outages, and signed-event reconciliation.
- Coverage regressions: initial/post-action failures continue UX, fatal execution retains partial evidence and the active page URL, raw/saved/fresh/print/Markdown/CSV output retains failure evidence, and legacy results remain unknown.
- Comparison/email regressions: failed, empty, unknown, and unvisited prior-location coverage cannot mark defects fixed. Observed new defects remain visible. An installed Supabase SDK client with synthetic responses verifies the notification path end to end without sending mail.
- An initial full web run timed out in the unchanged Turnstile test under concurrent check load (830 passed, one timeout). The complete rerun with four workers passed; no Turnstile code or test was changed.
- Independent code and API contract reviews: no remaining material issue found in these repairs after addressing the comparison/email gap and nullable client fields.

Both new migrations remain local and unapplied. See `docs/DEPLOYMENT.md` for migration order, webhook subscriptions, reconciliation of preexisting untracked sessions, and ambiguous-outcome handling. No production deployment, live payment, or live email was performed. These fixes cannot retroactively protect old Checkout Sessions that have no reservation.


## Production release preparation (2026-10-09)

The user subsequently authorized migration, deployment, and merge. This supersedes
the local-only rollout status above. Both migrations were applied to the linked
production database and their history/schema verified. Checkout RLS is enabled,
public roles have no grants, and scan coverage is nullable JSONB. The existing
Personaudit live Stripe webhook now includes expiry and async failure events; Stripe
reported zero open Checkout Sessions during the pre-release check. No live purchase
or email was sent. Application-key permissions and paid end-to-end fulfillment
remain unverified. Merge and deployment verification follow these preparations.
