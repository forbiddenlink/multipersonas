# Plan: Phase 2 — deploy-blocker infrastructure

**Written against:** `ea5b7b4` (main, 2026-07-26)
**Status:** destination doc. Frozen once work starts — reality lives in code + the ledger.
**Gate:** none of this flips on a public anonymous deploy. Public deploy stays OFF until
all three security blockers close AND Liz signs off. Her `PLAN-2026-07-15` still defers the
public web deploy pending a proven wedge (currently directional, n=4) — Phase 2 builds the
*capability* to deploy safely; the decision to actually deploy is separate.

## The three blockers (from docs/DEPLOYMENT.md)

1. **Browser can't run in the serverless route.** `web/src/app/api/audit/route.ts` calls
   `chromium.launch()` inside the request. Vercel has no Chromium, the bundle exceeds the
   size limit, the 120s budget exceeds function limits, and the AbortController never kills
   the browser. → **worker split.**
2. **Rate limit is fake.** In-process `Map`, per-instance, lost on recycle, keyed off a
   client-settable `X-Forwarded-For`. → **durable, shared rate limit.**
3. **No spend cap.** One run ≈ 65 sequential model calls; an anonymous caller can spend the
   Anthropic key until the card declines. → **global spend cap + kill switch.**
4. (Ops, not code) **Network isolation.** DNS rebinding can't be fully closed in-process;
   the durable fix is an egress firewall on the browser host. → **documented; host choice.**

## Architecture decision — reuse Supabase; browser host is Browserbase

- **Queue / rate-limit / spend ledger → Supabase (existing DB).** No new account, no Upstash.
  A Postgres table + a small atomic RPC covers all three. (minimal-code-ladder: reuse the
  lockfile/infra you already have before adding a dependency.)
- **Browser worker → host-agnostic code + Dockerfile.** Recommend **Browserbase** as the host:
  it supplies the egress firewall (blocker 4) for free. Railway Docker is the fallback but
  then the egress firewall must be configured deliberately. Code does not care which.

## Chunks (build order; each verifiable on its own)

### P2-A — durable rate limit + spend cap (Supabase, no external account) ← BUILD FIRST
- Migration `004`: `rate_limits(key text pk, window_start timestamptz, count int)` and
  `usage_counters(day date pk, model_calls int, runs int)`. Service-role only (RLS deny
  all; the route uses the service client, never the browser).
- Atomic RPC `consume_rate_limit(p_key, p_max, p_window_seconds) returns boolean` — single
  statement upsert-and-check, `SECURITY DEFINER` with an explicit `search_path` set (also
  fixes the advisor class flagged on the existing functions).
- `web/src/lib/rate-limit.ts` + `web/src/lib/spend.ts` — thin wrappers. Pure decision logic
  unit-tested (TDD); the SQL is integration-tested against the live dev DB.
- Route swaps the in-process `Map` for these. Spend cap checked before enqueue; env
  `AUDIT_KILL_SWITCH=1` hard-stops all runs.
- **This is shippable value even before the worker split** — it makes the existing route
  safe(r) and removes the fake limiter.

### P2-B — worker split (queue + worker package + polling)
- Migration `005`: `audit_jobs(id, user_id, url, persona_ids, status, result jsonb,
  error, created_at, ...)` with RLS (owner reads own; service role writes).
- New `worker/` workspace package: claims queued jobs (`for update skip locked`), runs
  `runMultiPersonaTest` (the engine is already deploy-agnostic), writes result + status.
  Ships a `Dockerfile` that runs `playwright install chromium`. Host-agnostic.
- Route becomes: validate + rate-limit + spend-check → insert `audit_jobs` row → return
  `{ jobId }` immediately (no browser in the request).
- Client: `audit-form` polls `GET /api/audit/[jobId]` until terminal, then renders results.
  Persistence (`saveAudit`) moves to the worker on completion.
- The current inline-run path is removed once the worker path is green.

### P2-C — network isolation + deploy runbook
- Document the egress-firewall requirement; Browserbase satisfies it, Railway needs
  deny-RFC1918/link-local configured. Update `docs/DEPLOYMENT.md` from "cannot deploy" to a
  real runbook. This is the human sign-off gate before any public deploy.

## Out of scope (unchanged from PLAN-2026-07-15)
- Stripe / pricing (no demand evidence).
- Actually flipping on a public anonymous deploy (separate decision, gated on the wedge).

## Verification per chunk
- Unit: rate-limit/spend decision logic, job-state transitions (vitest, TDD).
- Integration: RPC + RLS against the live dev project (service role vs anon).
- `pnpm lint && tsc --noEmit && test && build` green before each merge.
- Accountability contract (validation zone) recorded per chunk: checklist / evidence /
  owner (Liz) / status.
