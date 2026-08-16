# Deployment

**Status: not yet public. The architecture is now deployable; the last code blocker
(network isolation) has shipped — activating it is now an env-var + redeploy step, not
engineering — plus the rest of env/host setup below remain before flipping on a public
anonymous deploy.** Snapshot as of 2026-07-26, updated 2026-08-16.
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
3. **Network isolation for the browser — CODE SHIPPED, activation REMAINING.**
   `src/security/url-guard.ts` resolves and validates every navigation and the engine
   re-checks each document request, but DNS rebinding cannot be fully closed in-process.
   The worker image now builds + backgrounds a `smokescreen` egress proxy
   (`worker/Dockerfile`, `worker/entrypoint.sh`) that denies link-local + RFC1918 by
   default — verified locally (public URL proxies 200, `169.254.169.254` denied 407).
   Activating it on Railway needs `AUDIT_BROWSER_PROXY=http://127.0.0.1:4750` (+
   `AUDIT_REQUIRE_EGRESS_PROXY=1` once verified) set on the worker service, then a
   redeploy. See `docs/ssrf-egress-hardening.md`. This is the P2-C gate.

## Before flipping on a public deploy (checklist)

- [ ] `SUPABASE_SERVICE_ROLE_KEY` set on both the Vercel app and the worker host (without
      it, enqueue returns 503 and the rate-limit/spend-cap are disabled).
- [ ] `ANTHROPIC_API_KEY` on the worker host.
- [ ] `AUDIT_BROWSER_PROXY=http://127.0.0.1:4750` + `AUDIT_REQUIRE_EGRESS_PROXY=1` set on
      the worker host, and the worker redeployed with the smokescreen-enabled image
      (blocker 3 — code shipped, this is the activation step).
- [ ] Pre-existing Supabase advisors resolved (the `handle_new_user` / `set_updated_at`
      `search_path` + `SECURITY DEFINER` exec-by-anon warnings).
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

### Network isolation on Railway (blocker #3 — code shipped, needs activation)

Browserbase would give egress isolation for free; **Railway does not** by itself — its
containers have unrestricted outbound. As of this change the worker image builds and runs
its own `smokescreen` egress-guard sidecar (`worker/entrypoint.sh`), verified locally to
deny link-local/metadata addresses. It does nothing yet on a running deploy until the
worker is told to route through it:

```bash
railway variables --set AUDIT_BROWSER_PROXY=http://127.0.0.1:4750 \
                   --set AUDIT_REQUIRE_EGRESS_PROXY=1
railway up                         # redeploy — picks up the smokescreen-enabled image
```

- **Before this is set:** same as before — the in-process `src/security/url-guard.ts` is
  the only mitigation, and an attacker-supplied URL that rebinds DNS to an internal address
  is a residual risk. Acceptable for trusted/first-party target URLs or a gated rollout.
- **After this is set + verified:** the DNS-rebinding TOCTOU is closed at the network layer
  (smokescreen re-resolves and validates at connect time); `AUDIT_REQUIRE_EGRESS_PROXY=1`
  makes the worker refuse to launch the browser at all if the proxy is ever unreachable,
  rather than silently falling back to a direct connection.
