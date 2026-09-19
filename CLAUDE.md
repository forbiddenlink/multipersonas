# CLAUDE.md

## Project overview

Personaudit (npm package `multipersonas`, CLI binary `mpersonas`) is an accessibility and UX testing tool. `scan` crawls a site (including behind a saved login session) and runs axe-core at every reached state for deterministic, citable accessibility violations. `run` adds LLM-driven UX personas that browse toward a goal and report task success plus usability opinion; personas are validated for task success but do not out-find a plain crawler on accessibility defects, so they are not pitched as an accessibility tool. Status: prototype. Live site: https://personaudit.com/.

This is a pnpm workspace monorepo: the CLI/engine at the repo root, plus `web/` (Next.js app) and `worker/` (background audit job runner) as workspace packages.

## Stack

- Node >=20 (root `engines`)
- TypeScript 6.0.3
- CLI/engine deps: `playwright` ^1.62.1, `@axe-core/playwright` ^4.13.0, `ai` ^7.0.84 + `@ai-sdk/anthropic` ^4.0.45, `commander` ^15.0.0, `zod` ^4.4.3, `vitest` 4.1.11
- `web/`: Next.js 16.3.4, React 19.2.8, Tailwind CSS 4.3.3, `@base-ui/react` ^1.7.0, `@supabase/ssr` + `@supabase/supabase-js`, Stripe 22.4.0, `@sentry/nextjs` ^10.71.0, PostHog (`posthog-js`), `shadcn` 4.19.0, Playwright for e2e
- `worker/`: `tsx`, `@supabase/supabase-js`, `@sentry/node`, depends on the root package as `multipersonas` (workspace dependency)
- Package manager: pnpm (pnpm-lock.yaml at root; `packageManager: pnpm@10.34.5`)

## Commands

Root (CLI/engine):
```bash
pnpm install
pnpm dev -- <cmd>          # run CLI from source, e.g. pnpm dev -- scan https://example.com
pnpm build                 # tsc build to dist/
pnpm lint                  # eslint .
pnpm test                  # vitest run
pnpm test:watch            # vitest
pnpm typecheck:test        # tsc --noEmit -p tsconfig.test.json (tests, separate from build tsconfig)
pnpm exec tsc --noEmit     # typecheck source
pnpm check:prod-env        # scripts/check-prod-env.mjs against web/.vercel/.env.production.local
pnpm check:bundle          # scripts/check-bundle-budget.mjs web
pnpm smoke:prod            # scripts/prod-smoke.mjs
```

`web/` (run with `cd web` or `pnpm --filter web <script>`):
```bash
pnpm dev            # next dev --webpack
pnpm build           # next build --webpack
pnpm start
pnpm lint            # eslint
pnpm test            # vitest run
pnpm test:watch
pnpm test:e2e        # bash tests/e2e/run.sh
```

`worker/`:
```bash
pnpm --filter worker dev         # tsx watch src/index.ts
pnpm --filter worker start       # tsx src/index.ts
pnpm --filter worker typecheck   # tsc --noEmit
```

Full pre-PR check (from CONTRIBUTING.md / mirrors CI):
```bash
pnpm lint && pnpm exec tsc --noEmit && pnpm typecheck:test && pnpm test
cd web && pnpm lint && pnpm exec tsc --noEmit && pnpm test && pnpm build
```

## Layout

- `src/` - the `mpersonas` CLI/engine (TypeScript), published as npm package `multipersonas`. Subdirs: `agent/`, `auth/`, `crawler/`, `domain/`, `grader/`, `personas/`, `report/`, `security/`.
- `web/` - Next.js app, its own workspace with its own `package.json`, `AGENTS.md`, and `CLAUDE.md` (do not edit those from here; they govern `web/` specifically).
- `worker/` - persistent background job runner (claims `audit_jobs`, runs the browser + engine, writes results back). Depends on the root package as `multipersonas`.
- `experiments/` - evidence behind the product's positioning claims. Kept on purpose; do not delete.
- `docs/` - includes `DEPLOYMENT.md`, `TESTING.md`, `ssrf-egress-hardening.md`, ADRs (`docs/adr/`), plans, audits.
- `examples/github-actions/` - a ready-to-use CI accessibility gate action.
- `scripts/` - `axe-dogfood.mjs`, `check-bundle-budget.mjs`, `check-prod-env.mjs`, `fixture-session.ts`, `prod-smoke.mjs`, `shot.mjs`, `test-docker-context.sh`.
- `AI/diagrams/` - architecture diagrams.
- Root `railway.toml` builds `worker/Dockerfile` for the Railway worker service (no HTTP port; background process).
- Vercel project `multipersonas` is linked at the repo root with `rootDirectory: web`.

## Conventions

- Both `scan` (deterministic, axe-core, no model calls) and `run` (LLM personas) merge axe findings by a stable defect key (`src/agent/defect-key.ts`) that collapses framework-generated element ids, so one broken component reads as one defect across every state, not one per page.
- Persona profiles are built from `kind`, goals, viewport, and input modality (`src/personas/types.ts`). `kind: "ux"` personas produce opinion; `kind: "traversal"` personas are explicitly told they are not a person and must not judge accessibility.
- The agent loop (`src/agent/engine.ts`) sends a bounded window of recent history (`HISTORY_WINDOW`) rather than the full transcript, keeping input tokens flat across a run. Persona step budgets are bounded (a 3-persona `run` is on the order of 65 model calls).
- `src/personas/framing.test.ts` enforces a product constraint: no persona profile may claim a disability, and none may be asked for a WCAG verdict.
- `src/security/url-guard.ts` is the SSRF chokepoint: every navigation (initial URL, agent `navigate` tool, axe scan, persona generation) resolves the hostname and rejects loopback, RFC1918, link-local (including `169.254.169.254`), CGNAT, and IPv6 equivalents plus IPv4-mapped/NAT64/6to4 wrappers. Redirects are re-vetted per document request.
- Tests excluded from the build tsconfig are typechecked separately (`tsconfig.test.json` / `pnpm typecheck:test`) to catch test/type drift.
- `pnpm.overrides` in root `package.json` pin several transitive deps (next, undici, vite, postcss, hono, nanoid, sharp, js-yaml, fast-uri, uuid) for security/version reasons; check there before assuming a dependency version is unconstrained.

## Testing

- Root: `vitest` (`pnpm test`), config-free (uses vitest defaults); type-level tests checked via `tsconfig.test.json`.
- `web/`: `vitest` unit tests (`vitest.config.ts`) plus Playwright e2e (`playwright.config.ts`, run via `pnpm test:e2e` / `tests/e2e/run.sh`).
- `docs/TESTING.md` documents testing against a real login-gated fixture (a disposable local Metabase container) to prove personas reach authenticated states a crawler cannot. Fixture credentials are written to a gitignored `.env.local` and a `.mpersonas-session.json` session file (mode 0600), never printed to a terminal.
- CI (`.github/workflows/ci.yml`) runs: lint, typecheck, build, and test for both the CLI and `web/`, plus a bundle-budget check. `.github/workflows/a11y-dogfood.yml` scans the deployed site with the product's own axe ruleset and fails on any violation. Separate workflows: `e2e.yml`, `semgrep.yml`, `deploy-prod.yml`, `worker-image.yml`, `dependabot-automerge.yml`, `dependabot-lockfile-resync.yml`.

## Env vars

`.env.example` exists at the repo root but could not be read in this session (the sandbox's secret-file guard blocks all `.env*` files regardless of tool, even `.env.example`). Known env vars from code/docs instead:

- `ANTHROPIC_API_KEY` - required for `run`/`generate` (persona model calls); not needed for `scan`.
- `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (worker + web).
- `SUPABASE_SERVICE_ROLE_KEY` - required by the worker (bypasses RLS to claim/update jobs and write history). Server-side only, never ship to a client.
- `WORKER_POLL_MS` - optional, default 3000 (worker idle poll interval).
- `WORKER_REAP_INTERVAL_SECONDS` - optional, default 60 (worker stale-job check interval).
- `AUDIT_BROWSER_PROXY` - routes the audit browser through the in-container smokescreen egress guard (worker deploy).
- `AUDIT_REQUIRE_EGRESS_PROXY` - fail-closed flag: refuse to launch the audit browser if the egress proxy is unset/unreachable.

Re-check `.env.example` directly (outside this sandbox) for the complete, current list.

## Gotchas

- DNS rebinding is not fully closed in-process by `url-guard.ts` alone (resolve, then Chromium resolves again on connect). Closed at the network layer only on the Railway worker, via a `smokescreen` egress-guard sidecar (`worker/entrypoint.sh`); see `docs/ssrf-egress-hardening.md`.
- Never simulate a disabled user as a persona. This is a permanent, enforced product constraint (test-enforced in `src/personas/framing.test.ts`), not a style choice.
- Personas do not outperform a plain crawler at finding accessibility defects (measured in `experiments/personas-vs-crawler/`); don't market or build toward that. Their validated distinct value is task success (`experiments/task-success-validity/`).
- `--allow-private` (for scanning localhost targets) is CLI-only. The hosted service must never set it, because there the URL comes from a stranger.
- No surface may claim hosted behind-login scanning until it ships; behind-login is CLI-only today (see `CONTEXT.md`).
- The baseline/CI gate (`--baseline` / `--fail-on`) keys defects by a render-stable id so framework-generated element ids (e.g. `#mantine-…`) don't read as false regressions.
- `railway.toml` lives at the repo ROOT (not in `worker/`) because the Docker build context is the repo root (the worker Dockerfile pulls in the root engine too).
- The Railway worker's `startCommand` must point at `worker/entrypoint.sh` (which backgrounds smokescreen before exec'ing the worker) - overriding it skips the egress guard and silently falls back to an unguarded direct browser launch.
- `web/` has its own `AGENTS.md` and `CLAUDE.md`; this file governs the repo root and the `src/`/`worker/`/shared-tooling layer, not `web/`-specific conventions.
- Session artifacts (`.mpersonas-session.json`, saved via `mpersonas auth`) are credential-equivalent; `mpersonas run` refuses to use one if other users can read it.
