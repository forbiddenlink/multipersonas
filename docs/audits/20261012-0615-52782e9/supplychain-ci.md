# Supply chain, CI and package audit (HEAD 52782e9, 2026-10-12, audit-only)
Modules: gha-workflow-security, secrets-scan, supplychain, deps, cicd, cli-package. docs/audits/ left untracked, .gitignore untouched.

## Findings
| ID | Sev | Conf | Location | Problem | Impact | Fix | Verification |
|---|---|---|---|---|---|---|---|
| GHA-001 | Medium | High | .github/workflows/dependabot-lockfile-resync.yml:12,27-35 | pull_request_target checks out the PR head branch with `persist-credentials: true` and `AUTOMATION_TOKEN` (a PAT with contents write) in .git/config, then runs `pnpm install` on that branch's manifest. Gate is only `pull_request.user.login == 'dependabot[bot]'` (line 23). `--ignore-scripts` does not stop a `.pnpmfile.cjs` on the branch from executing. Checkout uses `head.ref`, not the SHA. | If a Dependabot branch is ever altered, code runs with a repo-write PAT. zizmor flags dangerous-triggers. | Check out `head.sha`; refuse if the diff touches anything but pnpm-lock.yaml/package.json; push with a step-scoped token. | zizmor 1.30.1; workflow read |
| GHA-002 | Low | High | dependabot-automerge.yml:7,17 | pull_request_target with contents+pull-requests write; gate is `github.actor == 'dependabot[bot]'` (zizmor bot-conditions, spoofable actor). No PR code is checked out. It waits only for ci.yml/test.yml/build.yml, not e2e/a11y/codeql. | Limited: branch protection still requires ci+e2e. | Use `pull_request.user.login`; rely on required checks. | zizmor; protection API |
| GHA-003 | Medium | High | deploy-prod.yml:36-38,48,52,54 | `pnpm dlx vercel@latest` (unpinned) runs with VERCEL_TOKEN in job-level env, so install-time code of any release sees the prod deploy token. | Compromised vercel release or dependency gets the production token. | Pin `vercel@<exact>`, scope token env to the steps that need it. | workflow read |
| GHA-004 | Low | High | GitHub environment `production` | Zero protection rules; the typed `confirm` input is the only gate. Header comment already says it is not a gate. | Anyone with write can run a prod deploy. Solo repo. | Add a required reviewer. | `gh api .../environments` rules: [] |
| SC-001 | Medium | High | package.json; npm registry | personaudit@0.1.0 published locally: attestations endpoint returns Not found, no publish workflow. 9 commits touch src since published gitHead b01ecf6 (34 files changed incl. security/sentry-scrub.ts). | No verifiable build origin; npm tarball lags source. | Publish from CI with `--provenance` or trusted publishing; cut a new version. | curl attestations; `git log b01ecf6..HEAD -- src` |
| SC-002 | Medium | Medium | pnpm-workspace.yaml (2 lines); package.json pnpm block | No `minimumReleaseAge` and no `onlyBuiltDependencies` in repo files. Two update bots (Dependabot config plus Renovate app, PRs #174/#175) with no renovate config in repo. A user-level npmrc sets only-built-dependencies (content unreadable here), so CI install policy is undeclared. | Freshly published malicious versions install immediately; build-script policy not reproducible. | Add cooldown and explicit build allowlist to pnpm-workspace.yaml; keep one bot, commit its config. | file reads |
| SC-003 | Low | High | package.json:116-137 | 18 overrides, 8 with unbounded `>=` floors (next, postcss, @hono/node-server, hono, nanoid, sharp, js-yaml, uuid). Lock resolves all in range today (next 16.3.8, js-yaml 5.4.1, nanoid 6.0.1). `uuid` override matches no lock entry, so it is dead. | Floating majors on next re-resolve; dead override rots. | Add upper bounds; drop uuid after `pnpm why uuid`. | pnpm-lock.yaml grep |
| DEP-001 | Low | High | pnpm-lock.yaml:2238 braces@3.0.3, GHSA-vfj7-8cjw-p6xm | Reachability (coordinator lead): sole path web devDependency eslint-config-next 16.3.8 > @next/eslint-plugin-next > fast-glob > micromatch 4.0.8 > braces 3.0.3. `pnpm audit --prod` clean; full `pnpm audit` shows only this 1 high. Zero imports of braces/micromatch/fast-glob in src, web/src, web/app, worker/src. No patched version exists. | Dev-only lint tooling globbing repo-owned patterns; no untrusted-input path; not in runtime. | Dismiss as dev-only in Dependabot; recheck for a fix. | pnpm audit, grep |
| CI-001 | Low | High | ci.yml:97-99 | No audit step; comment says the audit endpoint is dead (410), but `pnpm audit` works locally on pnpm 10.34.6. | Stale claim; CI relies on bots alone. | Add non-blocking `pnpm audit --prod`. | local run |
| CI-002 | Low | High | branch protection (API) | Required checks: ci and e2e only; strict false; no required PR review; enforce_admins false. e2e.yml header says do NOT require e2e until proven stable, yet it is required. a11y-dogfood, worker-image, CodeQL not required. | Comment and config disagree. | Reconcile intended gates. | `gh api branches/main/protection` |
| CI-003 | Low | High | PR #175 renovate/non-major-automerge | Open and red: tsc fails at src/agent/axe-scan.ts:41 and src/grader/scan.ts:143 (`Page` type mismatch, playwright bump). Correctly blocked. main last 100 runs: 57 success, 3 failure, 40 cancelled. | Bump needs manual fix. | Fix types or hold the bump. | `gh run view 38195608861 --log-failed` |

Refuted / OK: every third-party action in all 9 workflows is full-SHA pinned (0 unpinned); top-level `contents: read` everywhere except the two pull_request_target workflows; `persist-credentials: false` on all other checkouts; no script injection (only html_url, head.sha, head.ref, via env); no self-hosted runners; no id-token/OIDC; default workflow token read-only and cannot approve PRs. Docker FROM lines digest-pinned; semgrep container pinned by tag only (Low).

Secrets: gitleaks 8.30.1 with `--log-opts=--all`, 444 commits, exit 0, 0 findings (also default run). This is the only secret-scan evidence (precheck scans timed out). Tracked env files are the three *.example files only; real env and session files are gitignored (.gitignore:5-9,26-29). GitHub secret scanning and push protection enabled. trufflehog not run (alias uses --only-verified live calls). No gitleaks config or lefthook in repo, so no local pre-commit hook (Low).

CLI package: version 0.1.0 equals registry latest. `npm pack --dry-run --ignore-scripts`: 61 files, 90.8 kB, dist/ + LICENSE + README + package.json; no tests, maps or env files. dist/cli.js has `#!/usr/bin/env node`, mode rwxr-xr-x. engines node >=20, `prepublishOnly: tsc`, no postinstall. dist is gitignored, so tarball content depends on the local build.

## Coverage matrix
| Area | Status | Reason |
|---|---|---|
| Workflow triggers, injection, permissions, pinning | inspected + zizmor offline | |
| Secrets, full history | verified | gitleaks --all |
| pnpm audit prod and full | verified | |
| Lockfile integrity | verified | 0 tarball/git/codeload hits, 1011 integrity entries |
| Overrides | verified against lock | |
| Install scripts / build allowlist | partial | lock has 0 `requiresBuild` entries; user npmrc unreadable |
| Branch protection, environments | verified | API |
| Recent CI runs | verified | last 100 |
| Package contents, shebang, registry | verified | |
| Provenance | verified absent | |
| Sole-maintainer, typosquat, SBOM, Socket | not covered | no analysis run; no SBOM in CI |
| Native libs (sharp/libvips, Playwright browsers) | not covered | manual upstream check |
| Licenses; CLI --help/failing run | not covered | out of this pass |
| Renovate app settings | blocked | config not in repo |

Smallest next action: pin `vercel@<version>` in deploy-prod.yml and harden the resync checkout (GHA-001/003).
