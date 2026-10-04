# Personaudit production readiness — 2026-09-29

## Verdict

The checked release has substantial automated coverage and passing public availability
checks. This does not establish complete production readiness, product excellence, or
customer demand. This pass found and repaired a dependency security issue and a health
monitoring blind spot. The repairs are local and have not been deployed.

Scope: the personal Personaudit repository, public website GET requests, and repository
CI/security metadata. No customer records, payment records, credentials, or private
client sites were inspected. No production jobs, payments, or outreach were initiated.

## Repairs

- **High: vulnerable transitive dependency.** GitHub reported
  [GHSA-58mr-gqgx-xq4g](https://github.com/advisories/GHSA-58mr-gqgx-xq4g) against
  installed `fast-uri` 3.1.6. The advisory describes malformed-authority host confusion;
  this review did not establish an exploitable path through Personaudit. Dependabot's
  update run failed. Raised the existing override floor to 3.1.7 and regenerated the
  lockfile; the installed graph resolves to patched 3.1.8. The subsequent Supabase compatibility repair updates only its related client packages in addition to fast-uri. The remote alert cannot reflect this local repair until release.
- **High: queued jobs could remain stranded while health returned 200.** The endpoint
  only detected stale running jobs. It now returns 503 for jobs queued longer than
  fifteen minutes, retaining the existing running-job threshold. Eight route tests use
  the real Supabase query builder with synthetic HTTP responses. The stale-queue test
  reproduced the incorrect 200 before the repair.
- **Medium: unbounded dependency checks and inconsistent failure responses.** Health
  queries now share a five-second abort signal; client initialization failures return a
  non-sensitive 503. The regression suite includes a database request that never responds
  until cancellation, and verifies the resulting failure response.

Operational limit: an empty queue still cannot prove that a worker is alive. Stale-queue
detection signals excessive waiting, which may reflect insufficient capacity or an
offline worker. It does not diagnose which one caused the delay.

## Live evidence

- Existing public smoke suite: all eight checks passed (health, six public routes,
  unauthenticated dashboard redirect). This tested the deployed version, not these repairs.
- At repository HEAD `7d27c005d9e832d7ff746b5a174151f30422260c`, latest CI, gated-app
  E2E, CodeQL, Semgrep, accessibility dogfood, and worker-image workflows succeeded.
- Main requires `ci` and `e2e`; administrator enforcement is disabled. Existing settings
  were inspected, not modified.
- Resolved the Supabase peer mismatch: SSR 0.12.7 requires supabase-js ^2.114.0; web and worker now require that range and lock 2.117.2. Both hosted workspaces declare Node >=22. Local SQL/auth/browser tests pass on the updated graph.

## What remains before a stronger readiness claim

1. Release the reviewed changes and verify their behavior on the deployed service.
2. Verify deployed worker configuration and recovery/capacity under representative load. A complete local HTTP grade → actual worker → persisted 10-page report succeeded in 31 seconds. Ten local SQL regression scripts verify admission, spend limits, scheduling, and recovery constraints; process tests cover timeout/cleanup. These are not deployed load or failover tests.
3. Verify Stripe sandbox purchase, entitlement, cancellation, retry, and reconciliation
   end to end. Unit coverage is not evidence of correct provider configuration.
4. Verify a database/storage restore and alert delivery without customer data. Neither
   recovery time nor on-call notification delivery was established in this pass.

## Customer value and demand

The checked experiments support a bounded task-success hypothesis, not a broad claim that
AI personas reproduce real users. The recorded two-target experiments ran each goal once;
the repository itself documents that limitation. Accessibility findings remain axe-based.

No current payment, repeat-use, retention, conversion, or cost-per-completed-run evidence
was inspected. Consequently willingness to pay and sustainable margins remain unknown.
The existing paid demand gate in `CONTEXT.md` and ADR 0002 is approximately fifteen agency
asks with at least two actual payments to continue, zero to reject the current hypothesis.
One payment is inconclusive. This is a small continuation signal, not product-market fit.
Hosted behind-login development remains subject to that gate.

UI, copy, and API design remain routed to Claude under the project's standing instructions.
The practical customer-validation task is to observe agencies completing a saved task,
reviewing evidence, retesting, and exporting a report, then measure repeat use and willingness
to pay. More features alone cannot establish that outcome.

## Expanded functional review

The user supplied a whole-app functional audit request and a reference prompt pack during this run. Current inventory and feature-level statuses are in `functional-review/coverage.md`; proposed scope decisions are in `functional-review/improvements.md`.

Additional repairs:
- Worker image built the obsolete `multipersonas` selector, which selected nothing and exited zero. Corrected to `personaudit --fail-if-no-match`; image build and offline non-root runtime imports now pass.
- Offline runtime exposed a second problem: pnpm was cached only for the build user and attempted a network download as the worker user. A shared Corepack cache removes that startup dependency. The new CI smoke check prevents both image failures from silently returning.
- Project-cap rejection and allowance-query errors were absent from the page's error whitelist. Three component regressions and both desktop/mobile browser regressions failed first; the fixed page now presents the original safe messages. The browser test covers project creation, cap rejection, editing, reload persistence, cancelled deletion, confirmed deletion, and database removal.
- Sample-report upgrade wording implied paid hosted behind-login scanning. Replaced the implication with the same CLI-only boundary used on pricing; product-honesty regression passed.
- Contributor installation instructions used the obsolete npm package name. Corrected the package/binary names and documented the workspace runtime requirement.

Verification: all 26 desktop/mobile E2E tests and all 10 SQL regression scripts passed against synthetic local data. Public crawl covered 17 pages with zero broken internal links, page/console errors, broken images, or axe violations. Its 186 request failures were all aborted RSC prefetches; a direct client-navigation probe succeeded without page errors. Two closed-response-stream server messages appeared during the passing browser suite; they remain observations, not a reproduced user-visible defect. Screenshots cover eight public pages at three viewport widths.

Disposable database containers/volumes, test worker images, fixture config, and synthetic browser login state were removed. No deployment or external communication occurred. Final command results are consolidated in `functional-review/evidence/checks.md`.
