# Deployment

**Status: not yet public. The architecture is deployable and all three security
blockers (rate limiting, spend cap, network isolation) are now closed and live in
production — the remaining checklist below is env/host setup, not engineering, before
flipping on a public anonymous deploy.** Snapshot as of 2026-07-26, updated 2026-08-16.
See `docs/PLAN-2026-07-26-phase2-deploy-infra.md`.

## Architecture (the worker split — BUILT)

```
Vercel (Next.js)  ──enqueue audit_jobs──>  Supabase (Postgres queue)
     │                                              │  claim_audit_job() (skip-locked)
     │                                     worker/ (Chromium + engine) ──runs──> writes result + history
     └──────────── poll /api/audit/[jobId] ─────────┘
```

`web/src/app/api/audit/route.ts` no longer launches Chromium. It validates, rate-limits,
reserves spend, inserts an `audit_jobs` row, and returns a `jobId`. The persistent
`worker/` (a container, host-agnostic — see `worker/Dockerfile` and `worker/README.md`)
claims queued jobs, runs `runMultiPersonaTest`, and writes the result back; the client
polls `/api/audit/[jobId]`. This removes the "no Chromium / exceeds serverless
size+time limits / AbortController doesn't kill the browser" problems that made the old
inline route undeployable.

## Blockers before any public deploy

The audit endpoint takes a URL from a stranger, points a browser at it, and lets an LLM
that read that page choose where to go next. Public + anonymous is a hostile environment.

1. **Durable rate limiting — DONE.** Was an in-process `Map`; now atomic Postgres
   (`consume_rate_limit`, migration 004; `web/src/lib/rate-limit.ts`). Shared across
   instances, not resettable. Requires `SUPABASE_SERVICE_ROLE_KEY` set (absent = allow +
   warn).
2. **Spend cap + kill switch — DONE.** Reserve-then-run against a daily model-call cap
   (`reserve_model_calls`, migration 004; `web/src/lib/spend.ts`) plus `AUDIT_KILL_SWITCH`.
   Requires the service key.
3. **Network isolation for the browser — DONE, live in production.**
   `src/security/url-guard.ts` resolves and validates every navigation and the engine
   re-checks each document request, but DNS rebinding could not be fully closed
   in-process. The worker image builds + backgrounds a `smokescreen` egress proxy
   (`worker/Dockerfile`, `worker/entrypoint.sh`) that denies link-local + RFC1918 by
   default — verified locally (public URL proxies 200, `169.254.169.254` denied 407)
   and now live on the Railway `multipersonas-worker` service:
   `AUDIT_BROWSER_PROXY=http://127.0.0.1:4750` + `AUDIT_REQUIRE_EGRESS_PROXY=1` are both
   set, and the redeployed container's logs confirm smokescreen's `[INFO] starting` line
   followed by a clean worker boot. See `docs/ssrf-egress-hardening.md`. P2-C gate closed.

## Before flipping on a public deploy (checklist)

- [ ] `SUPABASE_SERVICE_ROLE_KEY` set on both the Vercel app and the worker host (without
      it, enqueue returns 503 and the rate-limit/spend-cap are disabled).
- [ ] `ANTHROPIC_API_KEY` on the worker host.
- [x] `AUDIT_BROWSER_PROXY=http://127.0.0.1:4750` + `AUDIT_REQUIRE_EGRESS_PROXY=1` set on
      the worker host, and the worker redeployed with the smokescreen-enabled image
      (blocker 3 — DONE 2026-08-16, verified via `railway logs`).
- [x] Supabase security advisors resolved (2026-08-16, verified via
      `supabase db advisors --linked --type security`): `handle_new_user`/`set_updated_at`
      search_path (006) and SECURITY DEFINER exec-by-anon on `handle_new_user` and the rate
      limit/spend RPCs (007, 018) were already closed; migration 019 closed a live gap
      migration 017 had left open on `reserve_model_calls_scoped` (revoked from
      anon/authenticated but not PUBLIC — anon could call it directly over
      `/rest/v1/rpc/...` and manipulate the spend-cap counters). Remaining, non-schema:
      **Leaked Password Protection is disabled** — toggle it on in the Supabase Auth
      dashboard (Authentication → Policies → Password); this is a project-level Auth
      setting the CLI/migrations can't reach.
      ⚠️ **Do not run `supabase config push`** to fix it — `web/supabase/config.toml`
      still has the stale `site_url = "http://127.0.0.1:3000"` from local dev; pushing it
      would revert the production Site URL fix (the 2026-07-31 auth-redirect bug). Fix
      `config.toml` to match the live dashboard values first if config-as-code is wanted.
- [ ] Load/abuse check against the durable limiter + cap.

## Local development

```bash
pnpm install
cp .env.example .env          # ANTHROPIC_API_KEY is required
pnpm exec playwright install chromium
pnpm dev -- <url>             # CLI
```

For the web app, copy `.env.example` to `web/.env.local` and `cd web && pnpm dev`.

## Deploying the worker to Railway

Config is in `railway.toml` (root) — Dockerfile build from the repo root, background
service, no port. Steps (run from the repo root; the `railway` CLI is already
authenticated):

```bash
railway link                       # pick/create the project + service (interactive)
railway variables --set SUPABASE_URL=... \
                   --set SUPABASE_SERVICE_ROLE_KEY=... \
                   --set ANTHROPIC_API_KEY=...          # secrets stay in Railway
railway up                         # build worker/Dockerfile + deploy
railway logs                       # expect "[worker] started; polling every 3000ms"
```

Set the SAME `SUPABASE_SERVICE_ROLE_KEY` on the Vercel app (so `/api/audit` can enqueue).

### Network isolation on Railway (blocker #3 — CLOSED, live)

Browserbase would give egress isolation for free; **Railway does not** by itself — its
containers have unrestricted outbound. The worker image builds and runs its own
`smokescreen` egress-guard sidecar (`worker/entrypoint.sh`), verified locally to deny
link-local/metadata addresses, and both env vars are now set on the
`multipersonas-worker` service:

```bash
railway variables --set AUDIT_BROWSER_PROXY=http://127.0.0.1:4750   # set 2026-08-16, verified
railway variables --set AUDIT_REQUIRE_EGRESS_PROXY=1                # set 2026-08-16, verified
```

Each `railway variables --set` auto-triggered a redeploy; both were confirmed clean via
`railway logs` (smokescreen's `[INFO] starting`, then `[worker] started; polling`) before
the next step. The DNS-rebinding TOCTOU is now closed at the network layer (smokescreen
re-resolves and validates at connect time); `AUDIT_REQUIRE_EGRESS_PROXY=1` makes the
worker refuse to launch the browser at all if the proxy is ever unreachable, rather than
silently falling back to a direct connection.
