# Distinctive redesign v2: report

Snapshot of branch `design/distinctive-v2` (cut from origin/main 67dcc45), 2026-10-01. Local production build only; previews lack Supabase env.

## Signature moves
1. Exhibit tabs: every section opens as a numbered exhibit (ink tab on a 2px rule), numbered by a CSS counter. Long-form prose h2s become exhibits automatically.
2. Highlighter pass: one claim phrase per H1 is highlighted, sweeping once (700ms); ends finished under reduced motion.
3. Bates serials (`PA-0426-0001`) on sheet-shaped objects, plus a stamp that lands once on the hero sheet.

## Features added
Grade field inside the home hero (posts to the existing `/api/grade`, event names unchanged), crawl map as a ledger on phones, guide try-it sheet, pricing plans-at-a-glance sheet, auth reasons column, app exhibit headers, probe sheet on `/grade` at every width.

## Independent scores (fresh-context sonnet, screenshots + plan + rubric only)
Before (own baseline, not independently run): home about 4,4,4,4,3.5,3,4,3,4,4.
Home round 1: 4,4,4,4,4,3,4,5,5,3. Round 2: 5,4,4,4,4,4,4,4,5,3. Motion scores 3 because stills cannot show it.
Round 3 (last measured): grade 4-5, sample report 4-5, pricing 4-5, login/signup/forgot 3-4 (before the final dark-input and H1 fixes), docs/CI gate/WCAG/privacy 3-4 (before the final code-block and next-step fixes), dashboard, project detail and report 3 (report craft 2 on phones).

## Blocked or not at 4
Dashboard, project detail and the printable report. They need product decisions, listed in `needs-approval.md`. Auth, docs and guide fixes from round 3 were applied after the last review and were not re-scored.

## Lighthouse (mobile, Chromium for Testing, local build, placeholder Supabase env)
| Route | main perf / LCP | branch perf / LCP | a11y / BP / SEO (branch) | CLS |
|---|---|---|---|---|
| / (simulated) | 83 / 4.5s | 85 / 4.3s | 100 / 100 / 100 | 0 |
| /pricing (simulated) | 92 / 3.3s | 83 / 4.7s | 100 / 100 / 100 | 0 |
| /grade (simulated) | 86 / 4.2s | 85 / 4.4s | 100 / 100 / 100 | 0 |
| / (devtools throttling) | 97 / 1.9s | 98 / 1.8s | | 0 |
| /pricing (devtools throttling) | not run | 99 / 1.7s | | 0 |

Simulated LCP exceeds 2.5s on main already (the LCP element is hero text gated by font load, 91% render delay). `/pricing` regressed in the simulated run (3.3s to 4.7s, repeatable) with identical resources; cause not found. Under real throttling both pass.
Client JS chunk size: `.next/static/chunks` 2392 KB on both main and branch (no growth).

## Gates
axe dogfood: 16 routes x 2 themes, 0 violations. Smoke: 43 passed (axe both themes, 200% text reflow, console errors, signature moves, above-the-fold grade field, reduced motion).
ADDENDUM 3 after the last commit (dce5568), all exit 0: root lint, web lint, root tsc, web tsc, pnpm build, worker typecheck, tsc test config, pnpm test, pnpm test:browser, web pnpm test (--testTimeout=60000), web pnpm build, pnpm check:bundle.

## Not done
Behind-login console/network crawl of every app route, cross-browser (only Chromium), HOLD-FOR-LIZ diff review, image generation ($0 spent). See `needs-approval.md`.

## Commits
a00262f, caf2feb, 5f23c71, bd71fba, 1002899, dce5568. `web/supabase/config.toml` is never staged.
