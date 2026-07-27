# Deployment

**Status: not yet public. The architecture is now deployable; one blocker (network
isolation) plus env/host setup remain before flipping on a public anonymous deploy.**
Snapshot as of 2026-07-26. See `docs/PLAN-2026-07-26-phase2-deploy-infra.md`.

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
3. **Network isolation for the browser — REMAINING.** `src/security/url-guard.ts` resolves
   and validates every navigation and the engine re-checks each document request, but DNS
   rebinding cannot be fully closed in-process. The durable fix is running `worker/` where
   its egress denies link-local + RFC1918 by default — Browserbase gives this for free; a
   raw container host needs an egress firewall configured. This is the P2-C gate.

## Before flipping on a public deploy (checklist)

- [ ] `SUPABASE_SERVICE_ROLE_KEY` set on both the Vercel app and the worker host (without
      it, enqueue returns 503 and the rate-limit/spend-cap are disabled).
- [ ] `ANTHROPIC_API_KEY` on the worker host.
- [ ] Worker deployed to a host with egress isolation (blocker 3).
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

### ⚠️ Network isolation on Railway (blocker #3 — not fully closed)

Browserbase would give egress isolation for free; **Railway does not** — its containers
have unrestricted outbound. The in-process `src/security/url-guard.ts` (rejects
loopback/RFC1918/link-local/metadata and re-checks redirects) is the mitigation, but DNS
rebinding — resolve here, Chromium re-resolves on connect — cannot be fully closed in
process. So on Railway:

- **Acceptable now** for trusted/first-party target URLs or a gated (non-public) rollout.
- **Before fully-public anonymous audits:** either put the worker behind an egress firewall
  that denies link-local + RFC1918, or route the browser through Browserbase (connect over
  CDP) from the Railway worker. Until then, an attacker-supplied URL that rebinds DNS to an
  internal address is a residual risk.
