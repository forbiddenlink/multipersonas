# delta-quality: delta, testing, docs, a11y, seo

Run folder: docs/audits/20261012-0615-52782e9 (untracked; .gitignore not edited). Audit-only. HEAD 52782e9, branch main. Working tree: untracked docs/audits/20261012-0615-52782e9/, functional-review/, reports/, research_notes/ only (git status at start). Stack read from package.json, web/package.json, worker/package.json, pnpm-lock.yaml: Next 16.3.8, React 19.2.8, TS 6.0.3, Tailwind 4.3.3, Vitest 4.1.11, @testing-library/react 16.3.3, Playwright 1.62.1, pnpm 10.34.6. Supabase, Stripe, Resend, Sentry, PostHog, Turnstile, Railway worker. Mode: audit-only. Target env: local code only; no production reads.

## 1. Delta (prior findings vs current code)

Prior sources: docs/audits/2026-09-28-prompt-pack/report.md (8 findings, anchor commit 7d27c00), docs/audits/2026-09-29-production-readiness.md (7 repairs + 4 open items), docs/audits/2026-10-09-prompt-pack-review.md (9 repairs + 2 follow-ups + rollout notes). 56 commits and 399 files changed since 7d27c00. No finding in these reports carried a severity count table except the first (High 2, Medium 6); the other two list repairs by prose.

| Prior finding | Status | Evidence |
|---|---|---|
| AUTH-001 cookies/cache headers on redirects (High) | fixed, held | web/src/proxy.ts:20-38 (`redirectWithSession` copies cookies and cache-control/pragma/expires); web/src/__tests__/api/proxy-session.test.ts passes |
| GRADE-001 claim failure loses token (Med) | fixed, held | web/src/app/api/grade/route.ts:107-129 catches claim errors, returns 202 + token |
| STATE-001 malformed saved job (Med) | fixed, held | web/src/components/audit-form.tsx:46-53 shape-validates before use |
| STATE-002 Strict Mode poll cancel (Med) | fixed, held | audit-form.tsx:200-215 `ctrl.signal.aborted` guards |
| STATE-003 cross-account cache (High) | fixed, held | audit-form.tsx:119-121 keys scoped by `userId` |
| STATE-004 inaccessible `?job=` polling (Med) | fixed, held | web/src/lib/audit-client.ts:31 treats 401/403/404 as terminal |
| PRINT-001 print hides all pages (Med) | fixed, held | web/src/app/globals.css:549 rule scoped by `:has(.report-print-root)` |
| FORM-001 Turnstile token reuse (Med) | fixed, held | web/src/components/grade-form.tsx:146-150 resets on missing token |
| fast-uri advisory (High) | fixed, held | package.json:127 override `>=3.1.8 <4`; lockfile resolves 3.1.8 |
| Stale queued jobs return 200 (High) | fixed, held | web/src/app/api/health/route.ts:5,37-63,80 (queued threshold, 503) |
| Health query unbounded (Med) | fixed, held | health/route.ts:37 `AbortSignal.timeout` |
| Worker image built wrong selector, pnpm download at runtime | fixed, held | worker/Dockerfile:20 (COREPACK_HOME), :31 (`--filter personaudit --fail-if-no-match`) |
| Project-cap error not whitelisted | fixed (tests only) | web/src/__tests__/app/project-create-feedback.test.tsx, project-create-limit.test.ts pass |
| Sample-report upgrade copy implied hosted behind-login | fixed, held | web/src/app/sample-report/page.tsx:222 |
| Contributor docs used old package name | fixed, held | CONTRIBUTING.md:7-23 |
| Crawl budget / failed page = clean evidence | fixed, held (see QUAL-001 trade-off) | src/crawler/crawl.ts:44-47,76-87 |
| Sixth affected node dropped | fixed, held | src/agent/axe-scan.ts:46-47 `flatMap` over all nodes |
| Hash routes / canonical origin | fixed, held | src/crawler/crawl.ts:91,105-108 |
| Citation comma split | fixed, held | web/src/lib/report.ts:239 splits on ", " |
| Clean report claimed zero states | fixed, held | web/src/lib/report-summary.ts:47 |
| Notification claim consumed on missing data; first 200 starve | fixed, held | web/src/lib/scan-notify.ts:80-121 release, :140-148 pagination |
| Worker proxy depended on ambient env | fixed, held | worker/entrypoint.sh:41-42; worker/src/index.ts:24; worker/src/scan-process.ts:7 |
| History left "running" on persistence failure | fixed, held | worker/src/job-write.ts:30-62 |
| Checkout replay (reservation, idempotency key) | fixed in code, rollout partly unverifiable | web/src/lib/checkout.ts:49-57; migration 20261009140804; docs/DEPLOYMENT.md:151-165 says applied 2026-10-09 |
| Persona scan coverage dropped | fixed in code | src/agent/engine.ts:156,728,750; migration 20261009140805 |
| Hosted deploy of fixes verified on service (09-29 item 1) | unverifiable | no prod access this run; latest CI/dogfood on main green (see section 5) |
| Deployed worker capacity / failover under load (09-29 item 2) | still open, unverifiable | no repo evidence of a load test |
| Stripe sandbox purchase to fulfillment E2E (09-29 item 3, 10-09 "paid fulfillment unverified") | still open, unverifiable | no such test in web/tests/e2e |
| DB/storage restore drill, alert delivery (09-29 item 4) | still open, unverifiable | no restore evidence in repo |
| Turnstile prod keys, Supabase Auth dashboard settings (DEPLOYMENT.md header) | still open, unverifiable | owner dashboard items |

Counts: 26 prior repairs checked; 24 fixed-and-held (code read at the cited lines), 2 fixed in code with rollout unverifiable (checkout, persona coverage migrations). Regressed: 0. Still open: 4 operational items (all unverifiable from the repo). Newly introduced since the prior review: DELTA-001, QUAL-001, DOC-001..005, SEO-001/002, A11Y-001, and the dependency note below. 

Dependency delta (pnpm audit --audit-level=high, read-only advisory lookup): 1 high, `braces` GHSA-vfj7-8cjw-p6xm, "patched versions <0.0.0" (no fix exists), only path web > eslint-config-next > @next/eslint-plugin-next > fast-glob > micromatch > braces (dev tooling, not shipped). One open Dependabot alert matches. Left to the `deps` module; not counted as a finding here. Skipped as unchanged: none could be skipped by commit range because 399 files changed; the delta was scoped to the prior-finding locations.

## 2. Check results

| Command | Result |
|---|---|
| `pnpm test` (root) | pass: 42 files passed, 2 skipped; 556 tests passed, 19 skipped (3 platform `skipIf` cases in worker/src/*.test.ts; browser-condition suite is a separate `pnpm test:browser` run in CI) |
| `pnpm lint` | pass, exit 0, no warnings |
| `pnpm exec tsc --noEmit` | pass, exit 0 |
| `pnpm typecheck:test` | pass, exit 0 |
| `cd web && pnpm test --maxWorkers=4` | pass: 147 files, 914 tests, 0 failed (192 s). jsdom "Not implemented: navigation to another Document" warnings repeat; pre-existing per 10-09 review |
| `cd web && pnpm lint` | pass, exit 0 |
| `gh run list --workflow a11y-dogfood.yml` | main: success at d7eba09 (2026-10-12) and 52782e9 (2026-10-11); a cancelled run at 375522b was superseded. A renovate PR run (renovate/non-major-automerge) failed at `next build` type check: Playwright `waitForSelector` state type mismatch after a bump, unrelated to HEAD |

Not run: `pnpm test:browser`, web build, e2e (need Docker/Supabase, Chromium installs), `pnpm check:bundle`.

## 3. Testing assessment

- Test coverage: Strong. Critical path coverage: Covered, with gaps below. Infrastructure: Mature.
- Runner: Vitest 4.1.11 root (node env, root vitest.config.ts includes src, experiments, worker) and web (jsdom + @vitejs/plugin-react). RTL 16.3.3 (>= 16, ok for React 19). Playwright e2e (desktop + mobile), 14 SQL regression scripts plus a Python concurrency script under web/supabase/tests, run in .github/workflows/e2e.yml:88-91. CI (ci.yml) runs lint, both typechecks, build, test CLI, test:browser, test web, build web, bundle budget on Node 22; web and worker engines are `>=22` (web/package.json:5), consistent. No coverage tool configured (valid state; recorded).
- Route handler coverage: 12 of 15 API routes have a named test under web/src/__tests__/api (stripe-webhook, billing-portal, founding-checkout, auth-callback, proxy-session, schedules-notify/run-due, health, grade-claim/badge/validation, waitlist, personas, audit-*). `api/checkout/solo` is covered through founding-checkout.test.ts only by name proximity; I could not confirm the solo route is exercised separately (hypothesis). `api/grade/[token]` GET and `/r/[token]` page are covered by shared-report tests and report-share e2e.
- Not tested that should be: (a) no real Stripe sandbox run from checkout to entitlement (prior open item 3); (b) `/r/[token]`, `/grade/[token]`, dashboard and report pages have no axe check (A11Y-001); (c) no test for a multi-page crawl where a later page returns 4xx with partial evidence preserved or surfaced (current behavior throws, see QUAL-001).
- Skips: only platform `skipIf` cases (worker/src/scan-supervisor.test.ts:8,24; job-process.test.ts:69). No `.only`, `.todo`, or `.skip` found by grep over src, web/src, worker.

## 4. Findings

| ID | Severity | Confidence | Location | Problem | Impact | Fix | Verification |
|---|---|---|---|---|---|---|---|
| QUAL-001 | Medium | Medium | src/crawler/crawl.ts:76-87; tests src/crawler/crawl.test.ts:112,133 | Any later page returning HTTP >= 400 or a navigation timeout throws and aborts the whole crawl, discarding all evidence gathered so far | A single dead internal link, a 403 on an admin link under a session, or a logout/redirect link makes `scan`, the CI gate and `grade` fail with no report; a CI gate on a real site with one 404 can never go green or even produce a baseline | Record the failed URL in a `failed` list on `CrawlResult`, continue, report it as incomplete coverage, and make the gate exit non-zero or "incomplete" instead of throwing; keep entry-URL failure fatal | Add a crawl test with a 404 on page 2 of 3 asserting findings from pages 1 and 3 plus a `failed` entry; run `pnpm test` |
| A11Y-001 | Medium | High | scripts/axe-dogfood.mjs:15-34 (19 static routes); web/tests/smoke/public-smoke.spec.ts; web/tests/e2e/* (axe only for `scrollable-region-focusable`, public-accessibility.spec.ts:25) | The a11y dogfood and smoke axe runs cover only static public routes; the product's data-driven output pages (`/grade/[token]`, `/r/[token]`, `/audits/[id]`, `/audits/[id]/report`, dashboard, projects) are never axe-scanned in CI | An accessibility tool can ship a violation on the very pages customers hand to clients (the report and the share link) with CI green | Add an AxeBuilder pass with the same tag set to web/tests/e2e on the seeded report, the share link and the dashboard, in light and dark | Run `pnpm test:e2e` with the new specs failing first on an injected violation |
| DOC-001 | Medium | High | README.md:13; docs/demo/ contains only scan.tape | README embeds docs/demo/scan.gif, which does not exist (git ls-files docs/demo lists scan.tape only; not gitignored per `git check-ignore`) | Broken image at the top of the public README and npm page | Render the tape (`vhs docs/demo/scan.tape`) and commit the gif, or drop the image line | `git ls-files docs/demo` shows scan.gif; README renders on GitHub |
| DOC-002 | Medium | High | README.md:62; docs/github-action.md:23,94,114; examples/github-actions/accessibility-gate.yml:20 | Docs tell users to `uses: forbiddenlink/multipersonas@v1`, but the repo has no tags (`gh api repos/forbiddenlink/multipersonas/git/matching-refs/tags` returned `[]`; `git tag` empty) | Copying the documented workflow fails at "unable to resolve action" for every adopter | Cut and push a `v1` tag (and release) or document `@main`/a SHA until one exists | `gh api .../matching-refs/tags` lists `refs/tags/v1`; run the example workflow in a scratch repo |
| DOC-003 | Low | High | CLAUDE.md:85 ("`vitest`, config-free (uses vitest defaults)") vs vitest.config.ts:3-9 | Root testing note is stale: root has a vitest.config.ts including src, experiments, worker | Misleads a new session about where worker tests run | Edit the line to name the root config and its include globs | Re-read CLAUDE.md against vitest.config.ts |
| DOC-004 | Low | High | CLAUDE.md:Stack (Next.js 16.3.4, pnpm@10.34.5) vs web/package.json:26 (next 16.3.8), package.json:95 (pnpm@10.34.6); scripts list omits scripts/walkthrough.mjs | Pinned versions in CLAUDE.md drifted from the lockfile | Wrong version claims for agents and contributors | Update the two numbers or stop pinning patch versions in prose | Compare with package.json |
| DOC-005 | Low | High | docs/DEPLOYMENT.md:24-25 (`pnpm dev -- <url>`, "ANTHROPIC_API_KEY is required"); header "Snapshot updated 2026-08-26" (line 7); no entry for migrations 20261010120000_report_share_links.sql and 20261010150000_test_runs_project_ownership.sql; env inventory (lines 270-285) omits AUDIT_DAILY_CALL_CAP / AUDIT_CALLER_DAILY_CALL_CAP (web/src/lib/limits.ts:43,56) | `pnpm dev` has no default command (src/cli.ts defines named commands only, no `isDefault`), so the documented form errors; the key is only needed for `run`/`generate` (README says so); deploy doc has no rollout note for the two newest migrations, and the deploy model on the same page says a merge to main goes live with no step that applies migrations (deploy-prod.yml has no migration step) | New features (`/r/[token]` share links, test_runs ownership policy) can be live before their schema; contradictory setup advice | Fix the command to `pnpm dev -- scan <url>`, mark the key optional, add a rollout section for the two migrations with the apply-before-deploy order, list the two cap vars | `git grep` shows updated lines; confirm in `supabase migration list` against prod before the next merge (not run here) |
| DOC-006 | Low | Medium | web/src/app/guides/common-accessibility-issues/page.tsx:132; web/src/app/opengraph-image.tsx:5,38; CONTEXT.md:75-77 | "Personaudit runs axe-core at every state it reaches, including authenticated pages" and the OG tagline "Scan behind the login. Keep the password." do not say CLI-only, against CONTEXT.md's rule that no surface may imply hosted behind-login; CONTEXT.md still lists the Pro upsell as a "known violation as of 2026-08-29" (fixed per the 09-29 review) | Mild overclaim on a link-preview card seen by prospects | Add "with the CLI" to both strings; update the CONTEXT.md note | `rg -i "behind"` over web/src; honesty tests in web/src/__tests__ still pass |
| SEO-001 | Low | Medium | web/src/app/pricing/page.tsx:19-21 vs :176 (`isSoloCheckoutOpen()`) | Page title and description say "hosted workspace from $39" / "start at $39/month" unconditionally, while the Solo tier is only buyable when STRIPE_SOLO_PRICE_ID is set (CLAUDE.md Env vars) | Search snippet and share cards advertise a price the page may not let anyone buy | Build the metadata from the same flag (`generateMetadata`) | Unset the var locally, render /pricing, confirm title/description |
| SEO-002 | Low | Medium | web/public/robots.txt (`Disallow: /grade/`) vs web/src/app/grade/[token]/page.tsx:40 (`robots: {index:false}`) | The result pages are both noindex and blocked from crawling, so crawlers never read the noindex; a linked token URL can still appear as a URL-only result | Minor; token URLs are unguessable capability links | Drop the Disallow for `/grade/` (keep noindex) or accept it; note `/r/` is only noindex | `curl -s <url>/grade/x` meta robots; Search Console URL inspection (needs production) |

Considered and dropped after refutation: missing dialog focus-trap issues (no dialogs, `role="dialog"`, `aria-modal` or `<dialog>` anywhere in web/src); color contrast (see below); missing skip link (web/src/app/layout.tsx skip link targets `#main`, every layout/page defines `<main id="main">`); missing security.txt (web/public/.well-known/security.txt, Expires 2027-08-11, valid); missing canonical (all public pages set `alternates.canonical`); robots/sitemap (robots.txt has Sitemap line, sitemap.ts lists 18 public URLs incl. all 5 guides, app and auth routes excluded).

## 5. a11y and SEO static review

Method: code only. Rendered, focus-order, screen-reader, in-context contrast, 2.4.11 obscured-focus and 2.5.7 results are NOT COVERED (no browser).

- Contrast: computed from globals.css tokens (OKLCH to sRGB, WCAG ratios). Light: foreground/background 15.7, muted-foreground/background 6.5, on muted 5.9, primary/background 9.3, severity colors on card 5.6-6.7, input border/card 4.6 (>= 3 for 1.4.11), destructive 6.0. Dark: foreground 15.9, muted-foreground 7.7, severity 6.6-10.0, input/card 4.1. All pass AA; dark `--border` is a 13% alpha decorative rule, not a control boundary. APCA not computed.
- Focus: button.tsx:8, input.tsx:12 and settings/page.tsx:129 replace `outline-none` with 2px `focus-visible` outline using `--ring` (contrast 9.3-10.2 against background). Skip link in web/src/app/layout.tsx. No positive tabindex, no `div`/`span` onClick (grep).
- Targets (2.5.8): smallest variants are `xs` h-6 (24px) and `icon-xs` size-6 (24px), exactly at the AA minimum; default h-9, lg h-11. Pass by dimension; spacing exceptions unverified.
- Forms: inputs have `<label htmlFor>` or `aria-label` (grade-form.tsx:187-190, waitlist-form.tsx, audit-form.tsx:368-376); errors use `aria-describedby`/`role="alert"`.
- Images: only three `<img>` in web/src, all with descriptive alt (replay-theater.tsx:267, grade-badge-embed.tsx:24,60). Tables use captions in 12 places.
- Reduced motion: globals.css:188 collapses CSS animation/transition durations; JS motion respects `matchMedia` (grade-verdict-stamp.tsx:26, log-reveal.tsx:18). No Framer/GSAP present.
- Headings: one `<h1>` per rendered page template found by grep; waitlist page has two `<h1>` in mutually exclusive branches. sr-only `<h2>` used in guides (common-accessibility-issues/page.tsx:130).
- WCAG 2.2 new criteria: 2.4.11 NOT COVERED, 2.5.7 Pass (no drag UI found), 2.5.8 Pass by size (static), 3.2.6 NOT COVERED, 3.3.7 NOT COVERED, 3.3.8 Pass by inspection (email/password and email links, no CAPTCHA on auth forms; Turnstile on public grade only, whose a11y alternative was not checked). 2.4.13 recommendation only.
- Dogfood CI: scripts/axe-dogfood.mjs runs 19 routes x light/dark with wcag2a/aa, 21, 22aa and best-practice tags; passing on main (see section 2). Coverage limit is A11Y-001.
- SEO: Metadata API in layout.tsx with title template, per-page title/description/canonical, `viewport.colorScheme` and light/dark `themeColor`, SVG icon + apple-icon + 192/512/maskable PNG, manifest.ts, root opengraph-image.tsx (dynamic, 1200x630 per file convention; not rendered here), twitter card `summary_large_image`, SoftwareApplication JSON-LD with no fabricated rating, `html lang="en"`, robots.txt + sitemap, `/r/[token]` noindex + no-referrer headers (next.config.ts:73-78), security.txt, llms.txt. Not covered: server HTML per route (no `curl` against a built server), per-page OG tags in rendered head, Search Console/Bing/IndexNow (need production), og image dimensions.

## 6. Coverage matrix

| Area | Status | Reason |
|---|---|---|
| Delta vs 3 prior reports | inspected | code read at cited lines; prod state unverifiable |
| Root + web + worker tests, lint, tsc | verified | commands run, results above |
| CI workflow definitions | inspected | ci.yml, e2e.yml, a11y-dogfood.yml read; workflows not run |
| a11y-dogfood latest result | verified | `gh run list` (read-only) |
| Coverage of critical flows by tests | inspected | file inventory, not mutation tested |
| README/CLAUDE.md/CONTEXT.md/CONTRIBUTING/DEPLOYMENT accuracy | inspected | commands, paths, env var names diffed against code (62 env names in code vs doc names) |
| .env.example completeness | not covered | file read blocked by the audit rules and the sandbox; env var names were diffed against docs instead |
| .gitignore | inspected | .env*, session files ignored; .next not re-checked |
| "Behind-login is CLI-only" in web copy | inspected | grep over web/src; see DOC-006 |
| Static a11y (landmarks, labels, focus, alt, tokens) | inspected | code only |
| Rendered a11y, focus order, screen reader, WCAG 2.4.11/3.2.6/3.3.7 | not covered | no browser |
| SEO live HTML, OG render, sitemap URL status loop | not covered | no server/production access |
| Search Console, Bing, IndexNow | not covered | needs production |
| Prod DB migration state (20261010*), Stripe config, worker capacity, restore | not covered | no production access |

## 7. NOT covered, and smallest next action

Not covered: everything rendered or production-side listed above; `pnpm test:browser`, e2e and build were not run; `.env.example` contents; deployed Railway worker config.

Smallest next action: add the `v1` tag (DOC-002) or fix the Action snippet, since it is the only finding that breaks a documented user path outright. Highest value after that: QUAL-001 (crawl abort) and A11Y-001 (axe on `/r`, `/grade/[token]`, report pages).
