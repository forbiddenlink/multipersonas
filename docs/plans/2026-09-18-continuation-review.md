# Continuation review — 2026-09-18

Reviewed from `85dbcd1` plus the local changes described below. This is a source/history,
synthetic-test, and public-documentation review, not a production certification. No
customer records, live payment data, secrets, or confidential projects were inspected.

## Product continuation after the review

### Production rollout and trial — September 18, 2026 (September 19 UTC)

The user authorized deployment and the task → fix → retest trial after the local
implementation. The additive migration was applied first; the worker was updated
before the web controls were exposed. No queued or running jobs were present at the
initial check, and no saved-task columns existed before this release.

- Supabase recorded `20260919003858_saved_project_tasks`; the local filename now matches
  that applied version. Verified all four task columns and service-only enqueue access.
- Railway worker deployment `f9674556-1af3-474f-a24e-91ac988c7e37` reached SUCCESS and
  started polling. The deployed worker then completed two bounded synthetic task runs.
- Vercel release `dpl_UGXGWVeGCeCNeWwHQ2MAimz1uudK` built successfully, passed protected
  health/auth checks, and was promoted to production. The first staged build failed
  because the sanitized upload omitted test constants referenced by Playwright config;
  the upload was corrected before promotion. No application fix was needed for that.
  After promotion, `personaudit.com` resolved to this deployment and all six live
  smoke checks passed: database/queue health, four public pages, and the sign-in redirect.
- The new local browser regression, `web/tests/e2e/saved-task.spec.ts`, passed against
  a real isolated Supabase stack: sign in, save and reload the task, enqueue its
  snapshot, verify a broken keyboard control, replace it with a native link, retest,
  display comparison/replay/report, clear the task, and retain historical snapshots.
  Browser actions and history writes in this regression are deterministic test inputs;
  it does not exercise worker persistence or establish AI navigation reliability.
- All nine database regression scripts passed against that real local stack, including
  scheduled snapshots, access isolation, and spend accounting. The initial trial setup
  accidentally revoked its browser session through a global sign-out; it now looks up
  only the synthetic local user without changing sessions.
- Separately, the deployed model-driven worker tested a temporary, data-free public
  fixture. Before the fix, job `174f5165-90dd-466c-9592-ce63fe8b2755` completed with
  expected text **not observed**. After replacing the broken keyboard control with a
  native link, job `ef63f0c4-ff1c-48fb-93ac-30c8ba2791cc` completed with expected text
  **observed** on `/quote`. URL, task, expected text, and profile stayed the same.
  These anonymous synthetic jobs used 30 reserved calls each through the normal spend
  reservation function; reservations were retained because the model work ran.
  No customer data, customer sites, test users in production, or real transactions
  were involved. Two runs demonstrate this fixture only, not general accuracy.
- Closed the temporary public tunnel and fixture server. Stopped local Supabase with
  `--no-backup` and removed its temporary test workspace. Source changes remain
  uncommitted; deployment used an isolated upload without project environment files.

### Implementation and initial local verification

The user's follow-up prioritized product usefulness. Implemented a saved-task workflow:
one task per project, an explicit expected final-page text, per-profile browser evidence,
and comparison with the previous run when the task, starting URL, and profiles match.
This gives a concrete reason to return after fixing a site. Demand remains unproven;
the implementation itself is not evidence that customers want or will pay for it.

- Save the task and expected text before running. Clearing both fields restores the
  existing general audit. The selected profiles retain their interaction constraints.
- Manual and scheduled jobs snapshot the task when queued. Later edits cannot rewrite
  the task used by a historical run.
- A browser check looks for exact visible text on the final page, independently of the
  model's completion claim. It records observed, not observed, or inconclusive, with
  a verification frame when capture succeeds. Missing frames are not replaced by an
  unrelated screenshot.
- Replay, results, history, and reports distinguish this text check from human task
  success. Missing text does not establish a site blocker; task replays omit inferred
  frustration. Existing navigation and destructive-action safeguards remain in place.
- Comparisons refuse changed conditions, missing evidence, and inconclusive checks.
  Counts describe browser observations, not improvement caused by a particular fix.

Next product validation: on an owned synthetic site, test reachable and deliberately
blocked tasks, fix one barrier, and repeat with the same profiles. Measure false matches,
missed matches, cost, and repeatability before presenting this as reliable task completion.
Then observe whether prospective users can define a useful task and voluntarily retest
after a change. Keep confidential client sites and customer records outside Codex.
Authenticated scanning and the paid-demand gate below remain separate decisions.

Local verification for this continuation:

- Web suite: 256 passing tests. Engine tests cover model false-success claims, independent
  text verification, inconclusive checks, screenshot failures, and legacy behavior.
- Root suite: 417 passing tests and two platform skips, excluding the process-cleanup
  file that needs unsandboxed process inspection. Its six tests passed separately during
  the earlier review; this continuation does not change that process-control code.
- All migrations and nine database regression scripts pass in isolated PostgreSQL 17
  with synthetic Supabase auth/storage schema stand-ins, including saved-task ownership,
  immutable queue snapshots, scheduled snapshots, RLS, and service-only enqueue grants.
- Real Chromium on synthetic pages verifies visible exact text, hidden text, substring
  mismatches, and input values. No live model calls or external sites were used.
- Isolated Next production build succeeds using synthetic configuration, without reading
  project environment files. Bundle check passes at 718.3 KB gzipped against 750 KB.
- Root/worker/web typechecks and root/web lint pass. Full authenticated browser flow,
  production migration, deployment, and model-quality evaluation have not been performed.

The initial local verification above preceded the authorized rollout recorded at the
top of this section. See `docs/DEPLOYMENT.md` for subsequent release sequencing.

## Earlier billing review decision

Finish payment reliability and execute the existing paid demand test before adding
hosted behind-login scanning or more scan engines. The grader, projects, audit reports,
paid persona gate, and authenticated checkout already form a usable product path.
The repository does not establish current demand results; do not assume zero customers
from old planning notes, or assume a passed gate from a checkout implementation.

## What changed recently

- `735c33e`, `be95e56`, `f383100`: grade-to-account conversion, authenticated founding
  subscription checkout, and sign-in/resume behavior. The original Payment Link/manual
  fulfillment instructions no longer described the active button.
- `85dbcd1`: failed axe/crawl work no longer becomes a clean scan; worker result checks
  and baseline handling were tightened. Preserve this distinction in future scoring work.
- Existing experiment limitations still matter: `experiments/task-success-validity/README.md`
  reports a small evaluation, while `experiments/personas-vs-crawler/README.md` separates
  crawler defect coverage from persona task-success value. Neither justifies general
  accuracy claims or replacing human accessibility testing.

## Implemented in this review

1. The webhook now checks the saved profile row. Failed writes and missing profiles
   return 500 for Stripe retry instead of silently acknowledging a lost entitlement.
2. Checkout grants require subscription mode and `paid`/`no_payment_required` status;
   `checkout.session.async_payment_succeeded` handles delayed success.
3. Configuration validation rejects an enabled/partly configured founding checkout
   missing its Stripe variables or Supabase service-role configuration.
4. Updated deployment, demand-campaign setup, and entitlement instructions to match
   authenticated Checkout. Campaign message copy was not rewritten.

## Remaining billing and launch work

| Priority | Work | Acceptance evidence |
| --- | --- | --- |
| 1 | Design and implement durable subscription identity, event ordering/reconciliation, and duplicate-checkout prevention. Route the billing/API design decision to Claude under the workspace policy. | Replay a canceled subscription's old checkout and old active update without restoring access; cancellation of an old subscription cannot revoke a newer valid subscription; concurrent checkout attempts cannot double-subscribe a buyer. |
| 2 | Verify the complete buyer lifecycle in an isolated Stripe sandbox and preview deployment. | Payment grants access; failed/pending payment does not grant through Checkout; cancellation follows the chosen policy; simulated DB failure causes retry and eventual recovery; delayed confirmation has a clear buyer-visible state. |
| 3 | Make cancellation/refund support and Auth need capture operational. | A buyer can reach the cancellation path; owner can fulfill the stated refund commitment; buyers and decliners both provide Auth need and local-vs-hosted preference. Keep their records outside Codex. |
| 4 | Run the ADR 0002 demand test after the billing gates pass. | About 15 appropriate agencies asked, at least 2 actual payments to pass; zero fails; one remains inconclusive and does not unlock hosted-auth work. Track asked, clicked, paid, and reasons separately. Outreach requires the user's explicit sending instruction. |
| 5 | Extend the task-success evaluation with synthetic/owned targets. | Repeated runs per goal, reachable and blocked goals, persisted step trails, false-success and false-blocked rates, and model cost per completed run. Do not use agency client sites. |
| 6 | Verify operational evidence before wider promotion. | Matching web/worker/database versions, public-grade smoke test, delivered alerts, tested restore, current dependency advisory check, and production limits. The September 4 audit remains a checklist of evidence gaps, not live proof. |

Hosted session-artifact scanning stays behind the paid-demand gate. No new perf engine,
replay rewrite, or stronger accessibility-compliance claim is justified by this review.
User-facing design/copy and new API contracts remain work for Claude per the project boundary.

## Known limits in the current billing implementation

- Assigning the same plan twice is repeat-safe, but stale events can still overwrite newer
  states. There is no durable subscription ID or reconciliation process.
- The current subscription-event policy grants only `active`; trial/grace-period behavior
  needs an explicit decision. These changes do not establish a complete payment policy.
- `/settings?checkout=success` does not provide a dedicated pending-confirmation state.
- Checkout creates sessions without preventing duplicate active subscriptions.
- The paid-demand answers previously attached to the Payment Link are not automatically
  collected by the authenticated Checkout route.
- Presence checks cannot establish whether deployed keys, prices, event subscriptions,
  permissions, and webhook endpoints actually work. None were inspected here.

## Research and implications

- [Stripe webhook documentation](https://docs.stripe.com/webhooks) describes signature
  verification, retries, duplicate delivery, and non-guaranteed delivery order. That
  supports persistence checks now and durable lifecycle reconciliation as the next billing
  task. Repeat-safe assignments alone do not solve ordering.
- [Stripe subscription integration guidance](https://docs.stripe.com/billing/subscriptions/design-an-integration)
  is the primary reference for the next lifecycle design; this review does not substitute
  a new subscription architecture for the existing one.
- [W3C evaluation overview](https://www.w3.org/WAI/test-evaluate/) treats evaluation as
  more than running an automated tool. Preserve the distinction between automated
  findings, persona observations, and human evaluation.
- [Deque's current Axe DevTools description](https://www.deque.com/axe/devtools/) explicitly
  says automation complements manual and screen-reader testing. My inference: Personaudit
  should improve the evidence and repeatability of task-success reports rather than compete
  through broader automation claims.

## Verification

- Webhook regressions: 7 failures reproduced before the fix; all 14 tests pass afterward.
- Entire web suite: 234 tests pass with `NODE_OPTIONS=--no-experimental-webstorage` on the
  local Node 22.23.1 runtime. The default local environment produced 9 existing
  `localStorage` failures; the process-only flag resolves them without product edits.
- Root baseline: 399 passed, 2 Linux-only tests skipped, 5 failures caused by sandbox
  denial of process inspection. The affected worker file then passed all 6 tests outside
  the sandbox. No worker implementation was changed.
- New configuration regressions: 7 pass using isolated synthetic environment values.
- Root, root-test, and web typechecks pass. Lint passes for changed code files;
  `git diff --check` passes.
- No deployment, live payment, customer outreach, model-spend evaluation, or full browser
  end-to-end test was performed. No claim of production billing readiness is made.

## Expanded saved-task evaluation — protocol fixed before results

Nine model-driven worker runs: three repetitions each of multi-step navigation, a
native billing-period select, and an unavailable confirmation with misleading visible
substring, hidden exact text, and an input value. The first two tasks should observe
exact text; the third must not. Use the same first-time-visitor profile for all runs.
Cases and pages are fixed in `experiments/task-success-validity/saved-task-cases.ts`
and `saved-task-fixture.ts` before enqueueing. These public synthetic pages contain no
personal data and perform no transactions.

Record every run, including failures and inconclusive outcomes, without replacing
misses with retries. Reserve 25 calls per run (225 total) under one evaluation caller's
250-call ceiling; use a conservative 500-call global ceiling for this batch. This is a
reservation bound, not a dollar-cost estimate. No production quota settings change.

Go/no-go for expanding the pilot: zero false observations on the unavailable task,
no more than one missed reachable task among six, and no infrastructure failures or
inconclusive outcomes. Report per-case repeatability as well as aggregate counts.
A pass supports another pilot, not a general accuracy or human-success claim. The
three families and single profile remain a deliberately small synthetic sample.

### Expanded evaluation results

All nine predeclared runs completed on the deployed worker without replacement runs.
The fixtures' ground truth was verified separately with real-browser scripted actions
before enqueueing the model-driven jobs.

| Task family | Expected | Matches | Worker duration | Recorded steps |
| --- | --- | --- | --- | --- |
| Multi-step service → details → quote | Text observed | 3/3 | 12–13 seconds | 4 each |
| Native billing-period dropdown | Text observed | 3/3 | 9–12 seconds | 3 each |
| Unavailable confirmation with misleading text | Text not observed | 3/3 | 15–16 seconds | 2–3 |

False observations: **0/3** unavailable-task runs. Missed reachable tasks: **0/6**.
Infrastructure failures and inconclusive results: **0/9**. All three families were
consistent across their three attempts. The declared small-pilot gate passes.
This does not justify a general “100% accurate” claim: three negative cases are far too
few to bound the real false-positive rate tightly, and the pages are small synthetic
fixtures using one profile. The old native-select miss did not reproduce on this new
fixture; that does not retroactively change the older experiment's results.

Raw synthetic observations, job identifiers, timing, task snapshots, and evidence are in
`experiments/task-success-validity/saved-task-results-20260919.json`. The deployed model
identifier, token counts, and dollar cost are not recorded in existing job results;
225 reserved calls must not be presented as actual usage or cost. Anonymous worker
jobs do not exercise signed-in history persistence; the separate authenticated browser
trial covers that UI path with deterministic history inputs.

Closed the temporary fixture server and tunnel after the final run. No new product
release was needed: this continuation adds evaluation artifacts and a human-pilot
protocol in `docs/demand/agency-outreach.md`. Human demand remains untested in this
session, pending the user's choice of existing testers or a recruitment segment.

## Live infrastructure and sales-readiness review — September 19 UTC

Verified only Personaudit resources, public pages, and metadata; no customer/payment
records or secret values were inspected.

- **Vercel:** `personaudit.com` pointed to the intended READY production deployment.
  Production variable listing confirms Stripe, Supabase, Turnstile, Sentry, and cron
  configuration names exist. This establishes presence, not validity of their values.
  Public health, login redirect, and security-header checks passed. The CSP, HSTS,
  frame denial, and content-type protection headers were present.
- **Supabase:** all 14 public tables have RLS enabled. Authenticated users cannot update
  profile plan, Stripe customer ID, identity, or timestamps; only the intended profile
  display fields are writable. Public-schema security-definer functions have no execute
  grants for anonymous or authenticated roles. The journeys bucket is private and
  limits uploads to image MIME types and 5 MB.
- **Advisors:** security returned five informational RLS-without-policy notices for
  intentionally server-only tables; no security warnings/errors were returned. Performance
  returned one unindexed schedule→last-job foreign key, 14 unused-index notices, and
  an absolute Auth connection-limit notice. No measured performance problem justifies
  deleting indexes or changing capacity. The missing FK index is a future maintenance
  item, not a sales blocker. [Advisor explanations](https://supabase.com/docs/guides/database/database-linter).
- **Worker:** production deployment `f9674556-1af3-474f-a24e-91ac988c7e37` remains SUCCESS.
  Its successful synthetic task runs are recorded above. Alert delivery and failover
  were not exercised by this check; working source code alone does not prove delivery.
- **Dependencies:** `pnpm audit --prod` reported zero known vulnerabilities across
  364 production dependencies at the time of this review.

Corrections prepared in this review:

- Homepage, agency page, and Pro upsell now describe AI task attempts and explicit
  final-page text checks. Removed claims that a real person was observed or that the
  tool establishes checkout completion. The offer now lists saved tasks, evidence,
  and retests that work today. Existing price, pre-order terms, and refund commitments
  were retained; changing those commitments is a separate product decision.
- Checkout reads the caller's own saved plan and refuses a new subscription for an
  account already on Pro/Team. Failed/missing plan reads fail closed. Returning free
  accounts reuse their saved Stripe customer; provider errors produce a safe retryable
  response. This is **not** a concurrent-checkout lock or lifecycle reconciliation.
- Settings now shows access from the saved plan after returning from Checkout and
  explains a pending update. A billing-support email link provides an explicit route
  for cancellation, invoice, payment, and refund requests. It clearly says sending a
  request does not automatically cancel. Support mailbox delivery was not tested.
- Validation: all 262 web tests pass, including 21 checkout/webhook regressions;
  web typecheck, lint, and diff whitespace checks pass.

Still required before claiming the paid lifecycle is verified:

1. The user confirmed **ImKindaGeeky** as Personaudit's Stripe account. Configuration
   was inspected without reading customer or payment records; see the findings below.
2. The live catalog price and webhook destination are confirmed. The delayed-success
   event remains missing: its addition was rejected by automatic approval review and
   needs explicit approval. Only a live account is exposed by the connector; a sandbox
   needs separate setup for payment lifecycle tests.
3. Design durable subscription identity, serialized/reconciled access updates, and
   concurrent-checkout prevention; then test old checkout replay, out-of-order updates,
   old-subscription cancellation after replacement, and duplicate concurrent attempts.
   The user's workspace routing assigns new API design to Claude. The existing audit
   above is the concrete handoff; no new billing API contract was invented here.
4. Add a verified self-service billing portal consistent with the published end-of-period
   cancellation policy. Test payment, delayed confirmation, cancellation, and recovery
   in a Stripe sandbox; do not infer success from mocked API tests.
5. Verify backup/PITR configuration and a restore into an isolated destination, alert
   delivery, and support delivery. Do not copy customer data into Codex or restore over
   production. Existing stale checklist statements are not evidence of current settings.
6. Review applicable tax configuration before broader sales; tax collection and
   registrations were not inspected or changed. [Stripe recurring-payment tax guide](https://docs.stripe.com/billing/taxes/collect-taxes).

Live infrastructure is functioning. The remaining billing and operational evidence
above means this review is not a blanket sales-readiness certification.

The corrections were deployed as Vercel release
`dpl_8wMqFWt1J62e2kGET8S5ZN3Q8KM9`. Its protected health endpoint returned database/queue
OK with no backlog, and an unauthenticated checkout request returned 401 without
creating a session. The release was then promoted to the production domain.

Advisor reference links: [intentional RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
[missing foreign-key index](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys),
[unused-index notices](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index),
and [Auth connection strategy](https://supabase.com/docs/guides/deployment/going-into-prod).


### Confirmed Stripe configuration — September 19 UTC

- Account: `acct_1RAErAA1qZnsNmFK` (ImKindaGeeky), live, confirmed by the user.
- Active product: `prod_VFuvMN1kxPirW3`, Personaudit Founding Access.
- Its only returned active price and default price is
  `price_1UFP60A1qZnsNmFKpSx6X3An`: USD 19,900 cents per unit each month,
  licensed recurring billing, no configured trial. This verifies the catalog's
  $199/month price; the hosted environment's selected price value was not inspected.
  Price tax behavior is unspecified and product tax code is null; these fields alone
  do not establish tax obligations or account-wide tax settings.
- Enabled webhook `we_1UGNlPA1qZnsNmFK2cWZQUoy` points to
  `https://personaudit.com/api/stripe/webhook`, API version `2025-03-31.basil`.
  Currently subscribed: `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`.
- The deployed handler also handles `checkout.session.async_payment_succeeded`, but
  Stripe is not configured to send that event. The proposed update preserves the three
  events above and adds only this fourth event. It leaves URL, API version, status,
  signing secret, other endpoints, and financial terms unchanged.
- That precise update was attempted and rejected by automatic approval review:
  the reviewer treated authorization as inspection-only and warned about replacing
  subscribed events. No mutation succeeded. Explicit approval is now required; do not
  bypass the rejection using another tool.
- The account's sole portal configuration `bpc_1T5AaIA1qZnsNmFK8LeHKz3z` is active and
  default. Cancellation is enabled at period end with no proration; invoice history
  and payment-method updates are enabled, subscription switching is disabled.
  It has no default return URL, terms/privacy URLs, or hosted login page enabled.
  No Personaudit-specific portal configuration exists, and the app still needs its
  authenticated portal entry point. The shared default was not modified.
- No real checkout, subscription, customer, payment, refund, or event-payload records
  were created or read. Configuration inspection does not verify webhook signatures,
  delivery, cancellation, or end-to-end access updates.

## Third-party integration verification — September 19 UTC

The acceptance standard is configuration, correct project routing, delivery, and useful
outputs. A configured environment variable alone is not a pass.

### Completed and verified

- **PostHog:** connected project 325061 is named Default project in LizsOrg. The existing
  [Personaudit Activation dashboard](https://us.posthog.com/project/325061/dashboard/2036035)
  exists with grader, waitlist, and password signup insights. It had no website-wide
  filter. Added and verified a persisted `$host` filter for `personaudit.com` and
  `www.personaudit.com`, preserving existing tiles and their test-account exclusions.
- Added [checkout clicks](https://us.posthog.com/project/325061/insights/ksY705uW) to that
  dashboard using the existing `founding_checkout_clicked` instrumentation. The query
  was validated before saving: one aggregate event in the past 30 days, dated September
  14 UTC. This is evidence that this event has reached PostHog, not evidence of a sale,
  a real prospect, or current end-to-end delivery. No raw events or customer records
  were queried. This fourth tile explicitly states it is not a purchase metric.
- PostHog client configuration disables autocapture, replay, surveys, feature flags,
  and external dependency loading; respects Do Not Track; strips URL queries/fragments
  and grade tokens from pageview URLs. The connector's required `learn` command is
  unavailable for this client; tool discovery exposed configuration/query schemas and
  those calls succeeded. Alert/project-setting scopes are unavailable.
- **Sentry:** existing CLI authentication succeeds. `personaudit-web`
  (4511824575528960) and `personaudit-worker` (4511824575594496) exist in `imkindageeky`.
  Web settings showed spike protection enabled and TLS verification for outbound
  requests disabled. Enabled TLS verification; the UI acknowledged the checked state
  while saving. Persistence after reload was not independently verified.
- Web error monitor 7943135 exists, covers all environments, and points to project email
  alert 3779784, named “Send a notification for high priority issues.” This verifies a
  rule exists, not its recipient or delivery. Recent web releases exist; the most recent
  listed release was about 35 hours old, so current deployment release association and
  source-map processing still need verification.
- **Google-facing site configuration:** removed a sitemap last-modified timestamp that
  changed on every request. Added noindex/nofollow to protected app layout and login /
  signup metadata. Typecheck, focused lint, whitespace checks, and staged login metadata
  verification passed. Staged database/queue health passed with no backlog.
  [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap),
  [robots.txt limitations](https://developers.google.com/search/docs/crawling-indexing/robots/intro).
- Corrected stale deployment documentation claiming Turnstile variables were absent;
  their production names were verified present during the September 19 review.

### Access and verification gaps

- **Search Console:** the signed-in browser account cannot access the `personaudit.com`
  domain property. Filtering its property selector for `personaudit` returned “No
  matching property.” Verify domain ownership or use the owning account, then submit
  `https://personaudit.com/sitemap.xml` and inspect the homepage and agency page. This
  does not prove no property exists under another account. No ownership or access
  permissions were changed.
- **Sentry review boundaries:** automatic approval review rejected reading the alert
  detail because it could expose private recipients, and rejected the worker settings
  page because it could expose secrets. Do not bypass through another tool. Verify
  recipient/delivery and worker settings outside Codex under the current workspace
  data boundary, or provide an explicitly approved, sanitized configuration summary.
- **Sales attribution:** current dashboard measures interest/signup, not verified paid
  subscriptions or repeat task use. Add durable payment/access reconciliation and a
  server-confirmed payment metric only after the billing lifecycle design is approved.
  Do not call return-URL visits or checkout clicks revenue. OAuth completion is not
  covered by the password-signup funnel.
- **Sentry privacy:** source scrubbers do not establish comprehensive scrubbing of
  breadcrumbs, trace payloads, or arbitrary contexts. The worker's inline scrubber
  differs from the web helper and misses URL secrets in plain messages. These remain
  follow-up hardening items; no user event payloads were opened to investigate them.
- **Turnstile:** server validation checks success but not returned hostname/action.
  Dashboard hostname binding and a synthetic challenge test remain unverified.
- **Uptime/alerts:** health endpoint works, but the configured recurring monitor and
  actual notification delivery have not been verified. The Sentry web monitor list
  showed one error monitor and no uptime monitor for that project.
- **Email/auth:** support inbox, production email confirmation/reset delivery, sender
  DNS, and auth redirect configuration remain unverified. Do not send messages without
  explicit authorization or inspect real mail.
- **Axiom:** `NEXT_PUBLIC_AXIOM_INGEST_ENDPOINT` exists in Vercel's variable inventory,
  but no source reference was found. Verify whether a platform log drain uses it before
  treating it as active or removing it.
- **Other providers:** Supabase, Vercel, Railway, Stripe, and Anthropic are the deployed
  product stack. Earlier sections record their verified boundaries. Model usage costs,
  budget notifications, backups/restore drills, and delayed Stripe payment delivery
  remain incomplete. The earlier Stripe event addition remains blocked pending its
  specific approval; this integration request was not treated as that approval.

For this project's current stage, keep PostHog for product behavior, Sentry for errors,
Search Console for search visibility, and one uptime monitor for the existing health
endpoint. Do not add GA4, Tag Manager, advertising pixels, session replay, or a second
error tracker without a concrete need. More overlapping tools would not establish
whether agencies will pay. Existing click analytics plus verified payment outcomes
and repeated useful task runs are the relevant next measurements.

SEO corrections deployed and promoted as `dpl_GEQbNAxj58YoSq3QipMP9Xog2Lu2`.
All six production smoke checks passed. Public login/signup return noindex/nofollow;
the public sitemap no longer emits a fabricated lastmod.


## Follow-through after approval of all remaining checks — September 19 UTC

- User approved both continuation and the specific delayed-payment webhook fix.
  Re-read the Personaudit endpoint, preserved its three current events, added
  `checkout.session.async_payment_succeeded`, and re-read the saved configuration.
  The endpoint remains enabled at the same URL/API version. No payments or customer
  records were created/read. This resolves the earlier configuration approval blocker;
  it does not replace a Stripe sandbox lifecycle test.
- Public DNS: MX points to ImprovMX (`mx1`/`mx2`); SPF includes ImprovMX with `-all`;
  DMARC has `p=reject`, `sp=reject`, and strict DKIM/SPF alignment. No Google ownership
  TXT record was returned at the domain apex. Forwarding destinations, DKIM signing,
  authenticated outbound sending, and actual delivery remain unverified. Do not infer
  deliverability from DNS alone.
- Error-report privacy: moved the error scrubber into `src/security/sentry-scrub.ts`
  and wired both web and worker to it. The web wrapper preserves existing imports.
  URL scrubbing now removes credentials/fragments and masks private grade-result
  paths. Malformed absolute HTTP URLs are replaced, not echoed. Request headers,
  cookies, bodies, query strings, and user fields are removed. Breadcrumb payloads
  retain only sanitized URL/navigation values and numeric status codes; messages
  and exception text retain the existing email/URL redaction. Stack traces and
  grouping information remain. This is error-event hardening, not a claim that
  traces, arbitrary contexts, or all possible free-form sensitive strings are covered.
- Validation: 263 web tests passed before the final malformed-URL regression test;
  all nine scrubber tests passed afterward. Root build, web/worker typechecks and
  focused lint passed. Shared compiled worker import resolves during typecheck.
- Worker upload rejected by Railway CLI: `Unauthorized. Please run railway login
  again.` No new worker release was created. The authenticated Railway connector
  confirms the existing deployment `f9674556-1af3-474f-a24e-91ac988c7e37` is still SUCCESS.
  User was asked to run `railway login` without posting any token. The prepared source
  remains at `/tmp/multipersonas-task-release-wp7ss4jd` for the authenticated upload.
- Previous Sentry UI restrictions remain: no attempt was made to bypass blocked pages
  containing recipient PII or secrets. Search Console ownership remains unavailable.
  New billing API design remains assigned to Claude by the user's workspace policy.

The first web builds for shared error scrubbing failed before promotion. Automatic
approval review rejected remote build-log inspection because logs might contain
secrets. A sanitized local build reproduced a TypeScript loader failure for the shared
module in browser instrumentation. Added `transpilePackages: ["multipersonas"]` using
the installed Next.js configuration guide. The complete sanitized production build
then passed without production environment files. The compiled worker package import
and message/exception redaction also passed a direct synthetic runtime check.

Final web release `dpl_Hubx4J1s3tZ9F27PDuHdyfCxPmLR` reached READY, passed staged
health with an empty queue, and was promoted to personaudit.com. All six public
production smoke checks passed afterward. Worker privacy changes are still local /
prepared only, pending Railway login; the existing worker remains deployed.

Railway retry: an inherited `RAILWAY_API_TOKEN` is present (value not read), and
both its deployment attempt and the existing stored CLI login were unauthorized.
Started interactive `railway login` with token overrides removed and credentials
suppressed from output. Authentication is pending the user browser confirmation.
The connector still reports the existing worker deployment SUCCESS.

Interactive Railway login subsequently succeeded. Upload using the restored CLI
login (with stale token overrides removed for that command only) created worker
deployment `d5ee922c-eabe-4f71-ad43-1f31115be2b5`; rollout verification is pending.
Railway warned that railway.toml support ends December 1, 2026; migration to its new
IaC format is a separate maintenance item, not part of this privacy correction.

Worker deployment `d5ee922c-eabe-4f71-ad43-1f31115be2b5` reached SUCCESS.
All six public production smoke checks passed after rollout. The shared Sentry
error scrubber is now deployed to both web and worker. No synthetic error alert was
sent; delivery to the owner inbox remains unverified. The prepared temporary release
source was removed after successful rollout. Future Railway CLI commands should use
the restored login without the stale inherited token override; no shell secrets were
read or globally changed.

### Approved ownership and delivery follow-through

- Google domain ownership is now verified for `personaudit.com` in the approved
  Google account. The generated public TXT record was added to the existing Vercel
  DNS zone; retain it to preserve verification. Search Console accepted
  `https://personaudit.com/sitemap.xml` and subsequently reported **Sitemap processed
  successfully**, with **10 discovered pages**. Its initial transient "Couldn't
  fetch" status resolved on the detail page. Independently, the sitemap returned
  HTTP 200 and XML containing the ten public URLs. Discovery is not proof of indexing.
- Created enabled Sentry uptime monitor `10383180` for
  `https://personaudit.com/api/health`, project `personaudit-web`, environment
  `production`. Configuration: GET every minute, five-second timeout, success status
  200–299, incident after three consecutive failures, recovery after one success.
  The existing high-priority project email alert is listed as applicable; its
  recipient routing and notification delivery remain unverified. No upgrade or
  plan purchase was performed. After approximately two minutes, the monitor's
  summary showed **100% uptime** and **425 ms duration**, confirming measurement
  had started; the recent-check-in table had not populated yet. A separate live
  request returned `status: ok`, database/queue `ok`, and all backlog counts zero.
- With explicit send permission and the user's specified Gmail sender, sent the
  synthetic support email `PA-20260918-01` to `hello@personaudit.com`. Gmail confirmed
  SENT (message `1a0b7787ca6b80bc`). Exact-marker searches found no received copy yet;
  sending is confirmed, forwarding/inbox receipt is not. No unrelated mail was read.
- The approved Sentry test notification has not been sent: the prior automatic
  approval rejection of recipient-bearing alert details remains in effect. No
  alternate tool was used to bypass that restriction and no outage was induced.
