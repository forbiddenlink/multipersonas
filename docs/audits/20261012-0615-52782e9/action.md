# Action plan and gate (run 20261012-0615-52782e9)

Mode: audit-only. Commit 52782e9 (main, clean apart from untracked folders). No project files edited.
Prompt pack v5.2 (155 items). Routed with `audit route full`, plus web-stack prompts the router skipped
(supabase, stripe, webhooks, ratelimit, a11y, seo, resend, sentry-setup, timekeeping, data-integrity).

Area reports in this folder: `sec.md`, `ai-abuse.md`, `supplychain-ci.md`, `ops.md`, `delta-quality.md`.
Precheck: `.audit-report.md` (commit 52782e9, complete marker present).

## Orchestrator verification

These findings were re-read at the cited lines by the orchestrator after the area reviewers reported:

| Finding | Re-read result |
|---|---|
| SEC-002 | Confirmed. `001_initial_schema.sql`, `002_add_missing_rls_policies.sql`, and `20261010150000_test_runs_project_ownership.sql` grant authenticated users insert, update, and delete on their own `test_runs` and `findings`. |
| SEC-001 | Partially confirmed. `src/security/browser.ts:55-59` launches with no `chromiumSandbox`. `worker/Dockerfile:45` runs as `pwuser`. The `/proc` read path is reasoned, not reproduced. |
| AIR-001 | Confirmed. `src/personas/custom.ts:59` joins an unvalidated `id` into a path. The `id` comes from `generator.ts:44` and from the import schema at `cli.ts:34`. Both are `z.string()`. |
| OPS-002 / SEC-005 | Confirmed. The Stripe webhook's `catch {}` at `route.ts:83-86` records nothing. |
| OPS-005 | Confirmed. `route.ts:28` grants only `active` and `trialing`, so `past_due` drops the user to free immediately. This is a product decision. |
| DOC-001 / DOC-002 | Confirmed. `docs/demo/` holds only `scan.tape`, and `git ls-remote --tags origin` returns nothing. |
| GHA-001 | Confirmed as written, downgraded to Low. The gate is `pull_request.user.login`, not the spoofable actor form. The branch content is controlled only by Dependabot or repo writers. |
| QUAL-001 | Reclassified as a design tradeoff. The 2026-10-09 repair chose fail-closed on purpose, to avoid "clean" reports with missing pages. The open question is whether to record per-page failures and continue, not whether the behavior is a regression. |

No cross-model verification pass ran. The area reviewers each ran a self-refute pass, and the orchestrator re-read the claims in the table above.

## Prioritized actions (no length target; ordered by impact)

1. **SEC-001 (High):** isolate the audit Chromium from `SUPABASE_SERVICE_ROLE_KEY`. Either enable the sandbox (seccomp or user namespaces on Railway), or move the key out of the browser's process tree. Otherwise accept the risk in writing. This is a decision for Liz.
2. **OPS-001 (High):** verify Supabase PITR and the backup window in the dashboard, then do one restore into a branch. Today this is UNKNOWN.
3. **SEC-002 (Medium):** revoke user insert and delete on `test_runs` and `findings`. Restrict updates to the `share_*` and workflow columns the app actually writes. This is a migration, so it is a validation zone.
4. **AIR-001 (Medium):** validate persona `id` against `^[a-z0-9-]+$` at `saveCustomPersona` and `deleteCustomPersona`. One fix covers both generate and import.
5. **SEC-003 (Medium):** run the SSRF guard on redirect hops (via the `request.redirectedFrom()` chain or the response handler). Smokescreen covers the hosted worker only. The CLI has no proxy.
6. **ABU-001 / SEC-004 (Medium):** give paid persona jobs priority over anonymous grades in `claim`, or split the queues.
7. **ABU-002 / AIF-001 (Medium):** add token-based spend accounting. Cap per-trial-account use so about 20 trials cannot exhaust the global call cap.
8. **OPS-002 / OPS-003 / OPS-007 (Medium):** add Sentry capture plus structured logs to the Stripe webhook catch, Resend failures, and the cron RPC error.
9. **OPS-004 / OPS-008 (Medium):** write a rollback and incident runbook covering auto-deploy, manually applied migrations, and the kill switch (redeploy-only today).
10. **GHA-003 (Medium):** pin `vercel@<exact>` in `deploy-prod.yml` instead of `@latest` with the production token in env.
11. **SC-001 / SC-002 (Medium):** publish `personaudit` from CI with provenance. Add `minimumReleaseAge` and `onlyBuiltDependencies`. Remove the duplicate bot (Dependabot plus Renovate).
12. **DOC-001 / DOC-002 (Medium):** commit `docs/demo/scan.gif` and either tag `v1` or change the Action snippet to a SHA or path. Users copying the README snippet hit a broken workflow today.
13. **A11Y-001 (Medium):** extend `scripts/axe-dogfood.mjs` to the dynamic routes `/grade/[token]`, `/r/[token]`, the reports, and the dashboard (using a seeded fixture). The product is an accessibility tool, so this gap matters.
14. **OPS-005 (Medium, product):** decide on a dunning grace period for `past_due`.
15. Low items: see the area reports.

## Gate

**Verdict: CONDITIONAL GO for continued operation; no new launch push until items 1-3 are decided.**
No Critical finding. Tests are green: root 556 passed and 19 skipped, web 914 passed. Lint and typecheck are green. `a11y-dogfood` is green on 52782e9.

## Not covered

- All dashboard state: Supabase PITR, Auth settings and advisors; Vercel; Railway (whether smokescreen is live); Stripe webhook subscriptions; Resend DNS (`dig` was blocked); Sentry alerts.
- No rendered-browser pass, so visual, UX, cross-browser, and manual accessibility checks are not covered.
- No container run (SEC-001), no live model run, and no jailbreak probes.
- No load test and no restore drill.
- The precheck's gitleaks and semgrep timed out and trivy failed. A separate gitleaks run over all history found 0 leaks. Semgrep was not rerun.
- Strategy and growth modules (viability, pricing, competitive, channel-fit) were not run, because this was a hardening pass.

## Pack issues seen (for the pack maintainer, not this repo)

- `audit route` reads only the root manifest. In this pnpm monorepo it skipped supabase, stripe, resend, sentry-setup, a11y, and seo, all of which live in `web/`.
- `audit-precheck` reported "Sentry: NOT detected", "E2E: none", and "favicon missing" for the same reason. `web/` has `@sentry/nextjs`, Playwright e2e, and app icons.
