# Personaudit: growth and revenue readiness review

Reviewed 2026-09-23. Evidence: current local source, public production homepage and agency page viewed in a browser, automated tests, and primary-source competitor documentation. Production differs from the working tree. Existing uncommitted work was preserved. No customer records, contact lists, analytics accounts, credentials, or confidential client sites were inspected. Revenue, traffic, conversion rates, delivery costs, and actual demand remain unknown.

## Decision

Prioritize a credible paid agency workflow and a small paid demand test. More features, generic SEO articles, and paid traffic are premature until buyers demonstrate repeat use. This is a recommendation, not a finding that the product has no customers.

The opportunity is helping a small agency repeat a public-site task, inspect browser evidence, compare a retest, and produce a client-ready record with less manual assembly. That value needs measuring. A free scan, an AI persona label, and a claim to visit multiple states are insufficient differentiation by themselves.

Keep the existing $199/month founding offer as a testable hypothesis, rather than changing price without buyer evidence. Keep its pre-order boundary explicit: hosted behind-login scanning does not exist. Do not start building that pipeline merely to improve a landing page; the existing paid-demand gate still applies.

## What research changes

| Alternative | Verified capability | Implication for Personaudit |
| --- | --- | --- |
| [Pa11y](https://pa11y.org/) | Free, open-source CLI, daily dashboard testing, history, and CI tools. | Scanning, monitoring, and CI alone are not a unique reason to pay. |
| [Pope Tech](https://www.pope.tech/websites/pricing) | Free tier: one website, 25 pages, two users, scheduling, reports, and unlimited rescanning. Agency/reseller program exists. | The entry-level monitoring market is competitive. A ten-page free scan is an acquisition aid, not differentiation. |
| [Deque user-flow analysis](https://docs.deque.com/devtools-for-web/4/en/user-flow-analysis/) | Scans multi-page/multi-state flows, deduplicates issues, and shows a recorded timeline. | Remove blanket claims that competing tools only scan an already-open URL. Compete on a measured workflow advantage. |
| [Accessible Web RAMP](https://accessibleweb.com/pricing/) | Lists $49/month for one property, $99 for five, $299 for fifteen; advertises an agency program and authenticated scanning in beta at higher tiers. | The purported $50–300 SMB gap is not an empty market. $199 needs clear scope, limits, and proof of saved work. |
| [Checkly](https://www.checklyhq.com/pricing/) | Browser checks use Playwright to validate flows such as login, checkout, and forms; scheduling and debugging are part of the monitoring product. | Compare repeatability, setup effort, and evidence quality against scripted browser checks as well as accessibility tools. |
| [Rainforest QA](https://help.rainforestqa.com/docs/ai-powered-test-creation) | Advertises goal-driven AI test creation; its [automation product](https://www.rainforestqa.com/lp-automated-testing) includes plain-English tests, replay, and logs. | Natural-language tasks and AI browser navigation are also competitive capabilities, not unique differentiators. Hands-on quality and pricing have not been established here. |

These are vendor-published features and prices, not independent quality benchmarks. Prices were checked on the review date. [W3C's guidance](https://www.w3.org/WAI/test-evaluate/tools/selecting/) is explicit that automated tools cannot determine accessibility by themselves. Evidence reports should describe scope and untested criteria; they must not suggest a complete conformance determination or legal protection.

## Findings that matter to sales

### 1. The headline sells a different job from the paid upgrade

The homepage leads with local behind-login scanning (`web/src/app/page.tsx:47`). The paid gate unlocks hosted persona runs (`web/src/app/api/audit/route.ts:78`), while the agency offer combines current workspace features and a future authenticated pipeline (`web/src/app/for-agencies/page.tsx:451`). A buyer can reasonably choose the free CLI after reading the headline and see little reason to subscribe.

Claude brief: make the agency's recurring paid job understandable near the first call to action. Show a single honest example from saved task through recorded evidence to retest and report. State separately what is free, what the current paid workspace does, and what the pre-order funds. Do not promise team collaboration merely because the product calls itself an agency workspace. Prefer working product proof over further illustrated dashboards.

The production FAQ still says competing tools only scan an open URL; the local working copy already improves that paragraph (`web/src/app/for-agencies/page.tsx:73`). Review and release those existing corrections without overwriting them.

### 2. Several claims exceed the implementation

At the initial review, keyboard-only operation and slow connection were prompt conditions without browser enforcement. Both profiles are in the default selection (`web/src/lib/personas.ts:41`). The continuation fixes that implementation gap: keyboard profiles use real key events and bounded Tab navigation, direct-navigation bypass is blocked, and slow profiles apply controlled Chromium network emulation before loading the target. Browser fixtures verify the behavior. This is still bounded automated exploration, not exhaustive keyboard coverage, a real user's experience, or a conformance verdict. Existing stored runs are not retroactively validated; production retains its current behavior until release. See `docs/TESTING.md` for exact conditions and limits.

Saved-task verification currently checks visible exact text on the final page (`src/tasks/verify.ts:5`). This is useful, bounded evidence. It does not establish that a real person completed checkout or that a transaction succeeded. Next assertion design should consider an expected terminal URL/state and a condition absent before the task; design that contract with Claude before implementation.

The assertion benchmark below now demonstrates this limitation on synthetic pages. Editable/form text is excluded, and task runs refuse typing the expected confirmation, enforcing the existing prompt restriction in code. Old confirmations and exact text in an unrelated context still count as observed; the current contract cannot distinguish those from an intended task outcome.

The paid worker's persona path runs `runMultiPersonaTest` (`worker/src/scan-process.ts:17`), not the separate deterministic CLI crawler. The free hosted grade does crawl public pages. Keep this distinction clear: paying for personas does not currently buy a more comprehensive deterministic crawl. The experiment in `experiments/personas-vs-crawler/` supports the crawler as the accessibility coverage foundation.

### 3. The privacy page contradicts replay storage

`web/src/app/privacy/page.tsx:45` says screenshots and page content are not retained after the audit. The worker uploads replay screenshots to private storage and persists journey data (`worker/src/index.ts:298`); the app signs URLs when loading them (`web/src/lib/journey.ts:62`). This is a concrete product-trust blocker, independent of visual polish.

Claude brief: reconcile the published description with the actual data flow, retention, deletion behavior, and providers. Verify retention/deletion before naming a duration. The provider list should also reflect the payment processor used by the checkout. Do not invent a retention promise or silently delete existing user evidence to make the text true.

### 4. The purchase promise needs operational proof

The agency page advertises $199/month and cancellation at any time. Settings currently routes billing help to email (`web/src/app/(app)/settings/page.tsx:78`). The terms promise all founding payments back on request if hosted behind-login never ships (`web/src/app/terms/page.tsx:89`). That is an existing broad commitment, not a new recommendation. Define delivery and refund handling deliberately before scaling sales; do not quietly weaken the terms for existing buyers.

Run a Stripe sandbox purchase through account confirmation, checkout, entitlement activation, first paid run, renewal, cancellation, and refund handling. Verify a test-mode account and deployment before testing. No real charge was made in this review. Consider the Stripe Customer Portal for self-service cancellation and payment changes. Verify applicable tax registrations before enabling automated tax collection; configuration was not inspected here.

The offer and checkout previously used different readiness checks. The latest continuation consolidates them in `web/src/lib/founding-checkout.ts`: preserve the existing explicit `NEXT_PUBLIC_FOUNDING_CHECKOUT_URL` launch switch and require nonblank payment and entitlement credentials. The agency page, Settings, and checkout endpoint now use the same check. This prevents accepting a new checkout when fulfillment configuration is missing; it does not prove key permissions, the configured price, or webhook delivery.

### 5. Measurement stops too early

Previously the current checkout button recorded a click but not the authentication hurdle, API failure, or successful Stripe handoff. This review adds those distinctions without changing the UI. A click is not a payment, and a success query parameter is not proof of payment. Use confirmed billing records as the revenue source of truth.

Current analytics deliberately strips query strings and masks grade tokens. Preserve that privacy boundary. Do not add customer emails, submitted URLs, screenshots, or free-text notes to analytics for attribution. Source-level aggregate reporting is sufficient for the first small test; do not add a complex attribution system yet.

### 6. Evidence quality is a retention feature

The report loader previously substituted empty findings/journeys when database reads failed, and made a single unpaginated request for each. This continuation fixes both: failed or incomplete evidence prevents report generation, and ordered pagination retrieves all matching records under the caller's existing access rules. Exact counts detect incomplete reads or changes in record count rather than returning a partial report. Pagination is not a transactional snapshot; same-count edits during loading are not detected. Missing/inaccessible runs remain distinct from database failures. These checks do not certify that the worker originally captured every relevant state. [Supabase documents range pagination](https://supabase.com/docs/reference/javascript/using-modifiers-range), including the need for an explicit order.

The grader produces skipped-page information (`src/grader/scan.ts:174`). The latest worker continuation preserves the full engine result, including skipped URLs, in the existing `audit_jobs.result` before acknowledging completion. It remains subject to that job record's lifetime and database access controls. The generic audit-job endpoint explicitly suppresses grade-job results; the grade-token endpoint continues to expose only its existing public representation. This avoids exposing newly retained raw skipped URLs through an anonymous job capability. The public grade report still lacks skipped scope. A future report improvement should show reached, failed, and skipped scope, rather than encouraging readers to generalize a sample grade to an entire site. The queue record is not a permanent report archive; deleting it removes this retained scope.

The latest continuation also fixes free-scan execution: reject runs with no evaluable public pages, skip unsuccessful/missing HTTP responses instead of grading error documents, and exclude pages without any passed or failed axe checks. Failed navigation and blocked URLs now remain in the engine's existing skipped list alongside the remaining queue. These fixes do not add skipped scope to the hosted report; that storage/display gap remains open. HTTP 200 challenge/login pages are not reliably distinguishable from intended content by status alone.

The saved-task report already shows task text and derived results; its loader does not fetch persisted `task_outcomes` (`web/src/lib/report.ts:371`). Include appropriate evidence links/status in exported task evidence when implementing the report contract. Keep AI opinions out of the accessibility findings table.

## Changes made in this review

- Preserve a buyer's safe checkout destination when an authentication callback has a missing, expired, rejected, or failed code exchange. Recovery-link failures remain distinct. Regression tests cover successful checkout return, recovery, network failure, and external redirect rejection.
- Reconcile Stripe access against current subscriptions for the same customer, founding plan, and user, rather than replaying the status in a delayed webhook. Include active and trialing subscriptions; leave access untouched and return a retryable failure if reconciliation fails. Tests cover delayed checkout, old cancellation after replacement, wrong product/user, pagination, and inactive states.
- Reserve enough model-loop calls for the largest built-in persona step budget instead of assuming 25 for every profile. The current conservative bound is 30 per persona and is shared by immediate and scheduled runs. This does not measure tokens, provider retries, or actual dollars.
- Record checkout authentication requirements, failures, and Stripe handoff separately from CTA clicks. Events contain coarse status/reason data, not provider error text or personal data.
- Enforce the selected keyboard and network conditions in the browser, record actual keyboard action results, and abort slow-profile runs if throttling cannot be installed. Add real-browser regression checks to CI alongside unit tests; no model calls are needed for those fixtures.
- Prevent database failures and row limits from silently creating incomplete reports. Regression fixtures cover failed initial/later reads, valid empty findings, missing runs, more than 1,000 findings, smaller server pages, later persona evidence, and inconsistent counts. Database error details are not copied into the report error.
- Reject unsupported free-scan grades and preserve failed/blocked URLs in engine scope. Align offer availability and checkout acceptance with one server-only configuration gate while retaining the explicit launch switch.
- Save complete free-scan results before completing jobs; persist the grade row's terminal status so it survives loss of its queue reference. Reject failed result/status reads rather than falling back to stale completion or treating an outage as an unknown token. The linked job remains the authoritative lifecycle source while available.

Billing reconciliation reduces stale sequential-event failures; it is not a durable event ledger or complete serialization of concurrent requests. Multiple open checkouts/new customer creation and production payment configuration still need sandbox verification. No schema migrations, price changes, outreach, production deployment, or real payments were performed.

The webhook now needs permission to list Stripe subscriptions. Verify that permission on the deployment's restricted key before release; a denied read returns a retryable failure and leaves the existing plan untouched. No production key was inspected or changed.

## A focused 30-day demand test

### Before asking for money

Resolve the claim and privacy discrepancies above. Validate the complete sandbox buying path. Record one reproducible public/synthetic task with an intentionally broken state, a fix, and a comparable retest. Show the actual evidence and known limitations. Record time needed to produce a usable client report. Do not present fixture findings as customer results.

### Days 1–7: qualify the existing agency hypothesis

Liz selects roughly 15 suitable agencies through permitted channels outside this Codex review. Prioritize agencies maintaining several sites, shipping changes repeatedly, and producing client reports. Ask about the most recent release check, current tools, reporting time, frequency, number of sites, and whether authenticated flows actually matter. Avoid leading with AI or hypothetical interest. No messages have been sent.

Give each qualified buyer the same current founding offer and explicit pre-order limitations. Offer assisted setup for one authorized public or synthetic flow, without claiming that onboarding is an already-scaled service. Keep objections separated: no recurring need, no authenticated need, price, trust/evidence, setup difficulty, missing capability.

### Days 8–14: observe activation

Track counts for qualified offers, offer visits, checkout clicks, auth hurdles, Stripe handoffs, confirmed payments, first useful result, first report, and a second run. A useful result means a buyer reviewed the evidence and could decide what to do next; an API returning 200 is insufficient.

Keep the existing decision rule: two or more paying agencies from roughly fifteen qualified asks justify the next validation phase; zero is a reason to revisit the buyer/job/offer, not to spend on traffic. One is inconclusive. Two payments are an early signal, not product-market fit. Record whether the payment was for existing task evidence or the future authenticated workflow, since those imply different product priorities.

### Days 15–30: test repeated value

Have buyers rerun after a real change and use the resulting evidence in their workflow. Measure report-preparation time before/after, useful defects, failed runs, support minutes, model/browser cost, and whether they return without prompting. Seek permission before using any quote, logo, or customer example. Continue only the product work that removes a repeated barrier to this loop.

Two accounts at the current price would be $398/month gross before fees, costs, refunds, and taxes. That arithmetic is not a forecast. Do not infer sustainable margins from the model-call reservation alone; measure dollars per completed useful run and support cost per account.

## Channel priority

1. Qualified founder-led agency conversations: quickest way to distinguish unclear offer, unreliable execution, and lack of need. Keep contact/customer data out of Codex.
2. A reproducible demonstration and client-report example: use in those conversations and on the site after the Claude content pass.
3. Developer distribution through the existing CLI/CI guide and examples: measure qualified agency activation, not package downloads alone.
4. Narrow, evidence-backed content answering repeat buyer questions about regression baselines, evidence handoff, and public-versus-authenticated scope. Publish after observing those questions; generic WCAG content already exists on the site.
5. Partnerships and paid acquisition only after repeat value and unit economics are demonstrated. Avoid broad campaign spend, speculative directories, and mass-produced SEO pages now.

## Claude handoff and acceptance criteria

The user's routing policy assigns user-facing UI, copy, and API design to Claude. This review leaves those surfaces intact and provides implementation requirements, not replacement marketing copy.

- One agency buyer should be able to explain what the paid plan delivers today after viewing the first screen and example.
- Free CLI, free hosted grade, current paid public-flow testing, and future hosted authentication must be distinguishable at purchase time.
- Every keyboard/network claim must match enforced behavior; synthetic agents must never be represented as real user research or disabled users.
- Every privacy/retention claim must match observed storage and deletion behavior.
- The primary offer and secondary feedback form must use consistent availability language; the live form says access is opening even while checkout is offered.
- Remove unsupported competitor generalizations and speculative lawsuit projections as persuasion. Link direct evidence where factual claims remain; do not infer that an automated report provides legal protection.
- Show limits, time-to-first-result, what the report contains, and the next action after a run. Verify these against implementation rather than inventing performance or ROI numbers.

## Validation boundaries

Initial review verification: root suite 423 passed, two skipped; web suite 286 passed. Root/web lint, root source and test typechecks, worker typecheck, web typecheck, root build, and web production build passed. The web bundle budget passed at 721.2 KB gzipped JavaScript against a 750 KB budget.

Continuation verification after browser-condition enforcement: root suite 430 passed, 12 skipped (ten opt-in browser tests plus two existing skips); the dedicated real-Chromium suite passed all ten tests. Web suite 286 passed. Root/web lint, root source and test typechecks, worker typecheck, web typecheck, and root build passed again. The web production build was not repeated because this continuation changes the engine and its tests, not web code. Independent review found no remaining actionable issue; diff whitespace checks passed. The new CI browser gate has been added locally but has not yet run on GitHub.

The initial sandbox blocked process inspection in worker tests and Google Fonts downloads in the build; approved reruns passed. A typecheck run overlapping the build encountered regenerated-file errors; the final standalone typecheck after the build passed.

Report-integrity continuation: 12 added regression cases reproduced 11 failures before the fix; all 22 report tests now pass. The full web suite passed 298 tests, web lint/typecheck and the production build passed, and the bundle check passed at 721.3 KB against 750 KB. Independent review of this specific delta found no actionable issue. Tests use synthetic database responses; no customer records or live database settings were inspected. At that point the checkout visibility/configuration mismatch remained open; the following pass aligns its code paths without changing deployed payment settings or offer copy.

Production browsing verified the public offer and signed-out checkout handoff only. Private dashboards, actual revenue, analytics configuration, database migrations, Stripe sandbox purchase, the web application's full browser end-to-end suite, and real customer outcomes were not verified. The engine's dedicated browser-condition fixtures do not establish any of those. No production deployment was performed.


Free-scan and checkout continuation: used the user-supplied local Project Audit Pack's conversion, error-recovery, and growth criteria to guide the review, with findings checked against current source. Eight grader behavior tests now cover failed navigation, missing/non-success HTTP responses, absent axe evidence, skipped scope, valid content, and hash-route navigation; six cases reproduced failures before the fix. [Playwright documents](https://playwright.dev/docs/api/class-page#page-goto) that HTTP error responses do not reject navigation and same-document hash navigation can return null. The implementation preserves the latter only for a known successfully loaded document.

Final checks for this pass: 438 engine tests passed (12 skipped: ten opt-in browser tests previously verified separately and two existing skips); 304 web tests passed. Root/web lint, root source/test typechecks, worker typecheck, both production builds, and the 721.3 KB bundle check passed. Six added checkout cases verify missing and whitespace-only configuration prevents creating a payment session. No live Stripe, customer, or database configuration was read or changed. The hosted skipped-scope display, privacy wording, and complete sandbox purchase remain outstanding.

Grade durability continuation: the worker now persists full engine evidence before the public grade row and final queue completion, checks every write, and stores completed/failed status on the grade row. Linked-job reads remain authoritative; a failed database read raises a generic error rather than displaying a stale completed result. Four added worker cases cover write sequencing and failure at each stage; ten web cases cover lifecycle reads and the existing ownership/capability boundary. Independent review identified potential exposure through the generic audit poll; the final implementation suppresses grade-job results there, with regression coverage for both anonymous and authenticated callers. No new public report fields, schema migration, production data inspection, or deployment were added.

Validation for grade durability: 442 engine tests and 314 web tests passed; root/web lint, source/test typechecks, worker typecheck, engine build, web production build, and the 721.3 KB bundle budget passed. The final independent review found no actionable issue. The ten opt-in browser-condition fixtures were not rerun because this pass changes persistence and access boundaries, not browser behavior; they remain verified in the earlier continuation.

## Competitive-validation phase: measured assertion behavior

The reproducible harness is `experiments/task-success-validity/assertion-benchmark.ts`; its frozen reference evaluator is `assertion-baseline.ts`. It runs eight fixed synthetic cases three times each in Chromium, with outbound network blocked. Actions are scripted. Completion is determined independently by a fixture state flag, not by the text matcher or model opinion. No customer data, model calls, paid competitor accounts, or live transactions are involved.

| Synthetic case | Fixture action completed | Original text observation | Hardened text observation |
| --- | --- | --- | --- |
| Working action | Yes | observed | observed |
| Broken action | No | not-observed | not-observed |
| Hidden confirmation | No | not-observed | not-observed |
| Longer example sentence | No | not-observed | not-observed |
| Old confirmation left on the page | No | observed | observed |
| Confirmation typed into editable content | No | observed | not-observed |
| Read-only input example | No | not-observed | not-observed |
| Confirmation in a demonstration context | No | observed | observed |

Every repeat agreed within its case. The original reference produced nine positive observations across 21 runs where the action had not completed; the hardened verifier produced six. Those are deliberately adversarial fixture counts, not estimated customer failure rates, and they do not measure model navigation. The remaining two scenarios prohibit a general claim that observed text proves task completion. The separate engine guard prevents typing the entire expected text (including whitespace-normalized variants) and records the refusal in replay; it does not solve every possible reflected-text or manufactured-state attack.

Raw evidence: `experiments/task-success-validity/assertion-results-20260923.json` and `assertion-results-hardened-20260923.json`. Both include the same harness fingerprint, their evaluator fingerprint, Chromium version, commit, and dirty-tree status. The baseline is an explicit frozen reference, not a claim that the entire dirty working tree was committed at that revision.

Reproduce from the repository root:

```bash
pnpm exec tsx experiments/task-success-validity/assertion-benchmark.ts /tmp/personaudit-assertion-baseline.json --baseline
pnpm exec tsx experiments/task-success-validity/assertion-benchmark.ts /tmp/personaudit-assertion-current.json
pnpm test:browser
```

### Next work, in priority order

1. **Stronger evidence implemented locally after Liz authorized Codex to take over.** Preserve existing saved tasks' text-observation meaning. Distinguish looking up information from completing a state-changing task; the latter needs task-specific evidence of a new, intended result in the correct context. Include stale confirmations, wrong routes, echoed input, broken actions, and absent evidence in acceptance cases. Do not turn all pre-existing text into failure: finding information already visible can be a valid task.
2. **Validate payment on isolated staging.** An isolated Personaudit URL connected to Stripe test mode and a test database has been requested. Until that environment is identified, do not run live charges or claim sandbox validation. Exercise signup/confirmation, checkout, access grant, first useful run, renewal, cancellation, delayed events, and the existing refund commitment. Verify live configuration only within the user's permitted data boundary; never request keys in chat.
3. **Prepare a trustworthy release.** Correct privacy/replay statements and verify deletion/retention behavior before promising a duration. Present actual tested, failed, and skipped scope. Preserve the distinction between free CLI, hosted public tasks, and the unbuilt hosted authentication workflow. Liz explicitly authorized Codex to take over this work; the local implementation and remaining release limits are recorded below.
4. **Run an actual comparative workflow evaluation.** On the same authorized synthetic task set, compare Personaudit with a scripted Playwright/axe baseline and accessible trial versions of one accessibility-flow tool and one AI testing tool. Record setup and maintenance time, repeatability across unchanged reruns, seeded-defect detection, false-success cases, report preparation time, and cost per useful result. Record unavailable trial access as unavailable; do not infer performance from vendor copy. No hands-on competitor account benchmark has been completed here.
5. **Run the existing paid demand test.** Keep the current approximately 15 qualified agencies / two payments continuation gate, while recording whether buyers want current public-flow evidence or future authenticated scanning. No contact list has been inspected and no outreach has been sent. Validate repeat use before expanding features or buying traffic.

Verification for this phase: 449 engine tests, 314 web tests, and all 14 real-browser tests passed. Root lint, source/test typechecks, engine build, worker typecheck, web typecheck, and the standalone benchmark typecheck passed. Independent review found no remaining actionable issue after adding the reproducible reference. No web implementation changed in this phase, so the previously passing web production build was not repeated. The broader product is not declared complete or best-in-class on this evidence.


## Takeover: contextual checks, report scope, and privacy

Liz explicitly authorized Codex to handle the previously deferred product/UI/copy work because Claude was unavailable. This pass implements the three highest-priority evidence/trust fixes, without changing live billing or deploying.

- Saved tasks keep version 1 semantics by default. Optional version 2 checks require an exact canonical final URL (including path, query, and fragment), text absent in the initial observation and visible in the final observation, or both. The destination must share the project's origin; the engine also rejects a cross-origin task before running personas if the starting URL differs. These checks are two browser observations, not evidence of causality, a completed backend transaction, or human task success.
- Task forms, run evidence, comparisons, CLI reports, and printable reports preserve the distinction. Printable reports now read stored task outcomes instead of reconstructing assertion results from a journey success boolean. Missing contextual evidence is not a pass, and a failed profile remains inconclusive alongside other profiles' results.
- Public grades now persist only safe coverage counts in their report JSON: configured page limit and discovered URLs not evaluated. The public view distinguishes these from evaluated pages; older reports explicitly have unknown skipped scope. Raw skipped URLs remain in the internal job evidence.
- The privacy page now discloses retained replay screenshots, visited URLs, actions, generated reasoning, task outcomes, private storage, temporary screenshot links, Stripe billing, and configured Turnstile. It no longer claims screenshots are discarded after a run or that deleting a project guarantees storage-file deletion. Processor references were checked against [Stripe](https://stripe.com/privacy), [Supabase](https://supabase.com/privacy), and [Anthropic](https://www.anthropic.com/legal/privacy). This corrects product behavior disclosures; it is not a legal certification or an implemented retention policy.

### Release sequence and remaining gates

Apply the saved-task migrations in order on an isolated test database, deploy the updated engine/worker before exposing version 2 task editing, then deploy the web app. The new constraint is `web/supabase/migrations/20260923134027_task_assertion_checks.sql`. Old workers reject unsupported task versions; a web-only rollout would therefore cause failed jobs. Existing queued version 1 snapshots retain their meaning.

The new constraint passed against PostgreSQL 17 in a network-isolated disposable container with synthetic data, including legacy rows, valid version 2 data, and six malformed cases. That test validates the constraint, not the complete deployed Supabase schema, RLS, scheduled snapshots, or production migration history. Full saved-task SQL integration fixtures were extended but have not been run against a complete staging stack in this pass.

Real Chromium tests demonstrate that a newly visible confirmation on the required destination passes, an already-present confirmation fails, and a newly visible confirmation on a wrong destination fails. This adds three cases to the 14 existing browser fixtures; it does not replace or improve the historical version 1 benchmark results above, and is not a competitive-performance claim.

Remaining: full isolated signup/payment/entitlement/run/retest flow, actual storage deletion and retention policy implementation, hands-on competitor workflow measurement, paid demand and repeat-use evidence. The changes remain local and uncommitted within the existing working tree; no production migration, deployment, live charge, or outreach occurred.

Final takeover verification: 463 engine tests passed (19 skipped: 17 opt-in browser tests plus two existing skips), 330 web tests passed, and all 17 dedicated Chromium tests passed. Root/web lint, source/test typechecks, worker typecheck, both production builds, and the 722.3 KB / 750 KB bundle budget passed. Independent review identified and resolved cross-origin task configuration and suppressed validation messages; the final review found no remaining blocker in this delta. Task-validation errors now share constants with the page allowlist and appear above the task form; rendered-page tests cover both recognized errors and rejection of arbitrary URL messages. The disposable database container, its volume, and the newly downloaded PostgreSQL image were removed after validation.

## Production release — September 23, 2026

Liz explicitly requested deployment. The release applied the backward-compatible task constraint, deployed the matching Railway worker, verified a production-target Vercel build before promotion, then synchronized source with upstream and published the combined release to `main`.

- Database migration: `20260923134027_task_assertion_checks` (the local filename matches the migration service's recorded version).
- Final application source: `8362afc24057b0ce8beb07afb2f6383e4d3685c1`; latest main commit `f2aa27f49565b16d823e90012763f3e3cf4521d7` adds browser-test coverage and fixture corrections only. The four newer upstream commits were preserved, including Next.js 16.3.5 and PostHog app identification. Independent review found no merge blocker.
- Final Vercel production deployment: `dpl_5BqqPn3YYTzh8LggAUWZxdXhgqUq`, serving https://personaudit.com/.
- Final Railway worker deployment: `c0bbea1d-4d88-4c13-8246-316477125cb2`, status SUCCESS; filtered startup logs confirmed the network guard and worker polling.
- Release packaging: the Vercel dry run initially included local session files and tooling caches. No Vercel upload occurred until `.vercelignore` excluded them. The corrected manifest retained pnpm workspace/lock files and required source, with zero matched local credential/session/cache artifacts. The actual production build succeeded.
- Live delivery trial: one accessibility-only scan of Personaudit completed, evaluated 10 pages, persisted coverage with 13 discovered URLs left untested, and reported zero automated violations. The new page displayed coverage and the generic public job endpoint withheld internal evidence. This trial exercised the first worker deployment of the same application logic before upstream dependency patches were incorporated.
- Final public checks: homepage, grade, agencies, login, database/queue health, dashboard sign-in redirect, signed-out checkout rejection, and tokenless bot-gate rejection passed. A fresh Chromium scan of the deployed application passed all 11 public routes in both themes with zero automated violations; the subsequent deployment contains test-only corrections, with production health checks repeated successfully.
- After the upstream merge: 463 engine tests and 331 web tests passed locally; source/test/worker types, lint, production builds, and the 721.4 KB / 750 KB bundle budget passed. GitHub CI, Semgrep, worker image, and accessibility workflow passed on `91c4166`. All five GitHub workflows also passed on `f2aa27f`: CI, Semgrep, worker image, accessibility dogfood, and gated-app E2E.

Payment settings were preserved. No live payment, customer record inspection, or outreach was performed. Full Stripe sandbox purchase/fulfillment, screenshot deletion/retention implementation, competitive workflow trials, and paid demand evidence remain separate unfinished work. Deployment does not establish those outcomes or a best-in-class product claim.

Future release preflight: fetch and compare upstream before building or deploying, so an older local checkout cannot temporarily omit newer dependency or analytics changes. Use the explicit Personaudit Vercel team/project rather than a global CLI account default.

The first signed-in E2E run passed the complete database security fixtures, including task constraints, but exposed three browser-test defects: reloading before an asynchronous save completed, a non-specific alert selector, and concurrent devices sharing a caller rate limit. The test now awaits the save response, filters the intended validation message, and uses an isolated synthetic user per device/retry. Cleanup refunds only those fixture jobs’ unused reservations. Independent review found no remaining blocker in that correction; setup failures before the cleanup block can leave synthetic rows only in the disposable CI database. Production rate limits were not relaxed. The corrected isolated workflow passed: [gated-app E2E run 35872659016](https://github.com/forbiddenlink/multipersonas/actions/runs/35872659016). This includes the full database security fixtures and desktop/mobile saved-task browser flow. The final production deployment is Ready and its live health checks passed.

## Replay file deletion — local, not deployed

Project deletion now reads every owned run and replay path, removes those private `journeys` objects, and confirms each one is no longer readable before deleting the project row. A failed or shifting read, a path outside the project's runs, a storage error, or a screenshot that is still readable keeps the project. The owner-delete policy is applied on the Personaudit database as migration `20260923174642_journey_screenshot_owner_delete`. The local filename matches that recorded version. Account deletion is still a manual request. A file uploaded during deletion can remain. No retention duration was added. Full Stripe sandbox purchase, competitor workflow trials, and paid demand evidence remain unfinished.
