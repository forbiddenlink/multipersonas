# Deployment

**Status: public production app, still pending two owner-dashboard hardening checks.**
The architecture is deployable and the original three security blockers (rate
limiting, spend cap, network isolation) are closed and live in production. The
remaining public-launch risks are Turnstile production keys and Supabase Auth dashboard
settings, not application code. Snapshot updated 2026-08-26.
See `docs/PLAN-2026-07-26-phase2-deploy-infra.md`.

## Deploy model: a push to `main` is live

Vercel's git integration deploys `main` to production automatically (reconnected
2026-08-02, `docs/audit-2026-08-02.md`). **There is no human gate between a merge and
production.** Treat every merge to `main` as a production release.

Two consequences worth holding onto:

- `.github/workflows/deploy-prod.yml` is not a gate, and its name ("manual") describes only
  its own trigger. It is the *verified* deploy path: it runs `scripts/check-prod-env.mjs`
  and `scripts/prod-smoke.mjs`, which the automatic git-integration deploy skips. Reach for
  it after an env change or to confirm prod health, not to control what ships.
- `.github/workflows/dependabot-automerge.yml` squash-merges patch and minor dependency PRs
  once CI is green, so those reach production unattended. The guard is the cooldown in
  `.github/dependabot.yml` (patch 3 days, minor 7, major 30) plus the CI gate, not review.

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
   (`worker/Dockerfile`, `worker/entrypoint.sh`) with explicit private/reserved
   `--deny-range` flags — verified locally (public URL proxies 200, `169.254.169.254` denied 407)
   and now live on the Railway `multipersonas-worker` service:
   `AUDIT_BROWSER_PROXY=http://127.0.0.1:4750` + `AUDIT_REQUIRE_EGRESS_PROXY=1` are both
   set, and the redeployed container's logs confirm smokescreen's `[INFO] starting` line
   followed by a clean worker boot. See `docs/ssrf-egress-hardening.md`. P2-C gate closed.

## Production readiness checklist

- [x] `SUPABASE_SERVICE_ROLE_KEY` set on the Vercel app and the worker host (verified by
      production smoke tests and service health checks; values must never be printed).
- [x] `ANTHROPIC_API_KEY` on the worker host.
- [x] `AUDIT_BROWSER_PROXY=http://127.0.0.1:4750` + `AUDIT_REQUIRE_EGRESS_PROXY=1` set on
      the worker host, and the worker redeployed with the smokescreen-enabled image
      (blocker 3 — DONE 2026-08-16, verified via `railway logs`).
- [x] Supabase security advisors checked (2026-08-26, verified via the Supabase
      connector after the CLI hung): no schema WARN/ERROR remains. The current INFO lints
      are expected deny-by-default tables with RLS enabled and no client policies:
      `grader_scans` (read through the service-role capability-token API only),
      `rate_limits`, `usage_counters`, and `usage_counters_by_caller` (service-role/RPC
      internals). `handle_new_user`/`set_updated_at` search_path (006) and SECURITY
      DEFINER exec-by-anon on `handle_new_user` and the rate limit/spend RPCs (007, 018)
      were already closed; migration 019 closed a live gap migration 017 had left open on
      `reserve_model_calls_scoped` (revoked from anon/authenticated but not PUBLIC — anon
      could call it directly over `/rest/v1/rpc/...` and manipulate the spend-cap
      counters). Remaining, non-schema WARN: **Leaked Password Protection is disabled** —
      toggle it on in the Supabase Auth dashboard (Authentication → Policies → Password);
      this is a project-level Auth setting the CLI/migrations can't reach.
      ⚠️ **Do not run `supabase config push`** to fix it — `web/supabase/config.toml`
      still has the stale `site_url = "http://127.0.0.1:3000"` from local dev; pushing it
      would revert the production Site URL fix (the 2026-07-31 auth-redirect bug). Fix
      `config.toml` to match the live dashboard values first if config-as-code is wanted.
- [x] Load/abuse guardrails against the durable limiter + cap are implemented:
      `/api/grade` uses Turnstile when configured, `GRADE_QUEUE_CAP`, and
      `consume_rate_limit`; `/api/audit` uses durable rate limiting plus the model-call
      spend cap.
- [ ] **CAPTCHA on the public grader — code-complete, pending keys.** Provision a
      Cloudflare Turnstile widget and set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (all envs) and
      `TURNSTILE_SECRET_KEY` (secret, prod) on the Vercel app. Unset = the gate is a no-op,
      so shipping the code changes nothing until the keys land. See "Bot protection" below.
- [ ] **Supabase "Confirm email" ON** (Authentication → Providers → Email). Nothing else
      gates free-tier signup abuse on unverified emails.
- [ ] **Supabase Leaked Password Protection ON** (Authentication → Policies → Password).
      This is still a project-level dashboard setting.
- [ ] **Supabase backup restore proof.** Confirm Point-in-Time Recovery / backups in the
      Supabase dashboard, then perform a restore into a temporary branch/project and run
      the production smoke checks against it. Do not restore over production as a drill.
- [ ] **Railway Config as Code migration.** `railway.toml` still works today, but Railway
      has announced a 2026-12-01 cutoff. `railway config migrate` produced a sparse dry-run,
      so review/apply the generated `.railway/railway.ts` before that date instead of
      accepting the migration blindly.

## Founding tier payment link (ADR 0002 demand test)

The demand test cannot run until this exists. Verified 2026-09-04: the live Stripe account
has **zero payment links and no Personaudit product**, and
`NEXT_PUBLIC_FOUNDING_CHECKOUT_URL` is unset in Vercel production, so `/for-agencies`
renders the waitlist fallback instead of the $199 offer. Terms of Service now carries the
billing, cancellation and refund section that ADR 0002 requires; do not create the link
before that is deployed.

1. **Stripe → Product catalogue → Add product.** Name it for the buyer, not the repo (the
   name appears on the checkout page and the card statement). Add a recurring price:
   **$199.00 USD, monthly**. One tier only, per ADR 0002.
2. **Stripe → Payment links → Create.** Select that price. Then:
   - Quantity adjustment **off**. One subscription per agency.
   - Add a **custom field** capturing *Auth need*: how many client sites need scanning
     behind a login. ADR 0002 requires this from buyers, because "we don't audit behind
     logins anyway" and "$199 is too much" are opposite findings that a bare yes/no cannot
     separate. Ask decliners the same question by hand.
   - Set the **terms of service URL** to `https://personaudit.com/terms` so the refund
     commitment is attached to the purchase rather than living only in marketing copy.
3. **Enable the Stripe customer portal** (Settings → Billing → Customer portal, allow
   subscription cancellation). `/for-agencies` promises "cancel any time"; without the
   portal that promise resolves to emailing a human, which is not the same thing.
4. **Copy the `https://buy.stripe.com/...` URL** into Vercel as
   `NEXT_PUBLIC_FOUNDING_CHECKOUT_URL` (production, and preview if you want to click it on
   a preview deploy first).
5. **Redeploy.** ⚠️ This is read at module scope in a server component
   (`web/src/app/for-agencies/page.tsx`), so saving the variable in Vercel changes nothing
   until a new build runs. Use the `Deploy production (manual)` workflow, which also runs
   the prod env check and smoke test.
6. **Verify:** `/for-agencies` shows "$199 a month. One price, no sales call." and the
   "Get founding access" button, and a click fires `founding_checkout_clicked` in PostHog.
   That event is the denominator the demand test reads against, so confirm it lands before
   sending any of the 15 messages.

## Bot protection on the public grader (Cloudflare Turnstile)

The free grader (`/api/grade`) is anonymous and axe-only (no model spend), but each call
still queues a real Chromium crawl. A per-IP rate limit can't stop a botnet that mints
fresh IPs, so promoting the grader publicly (Product Hunt, Reddit, SEO) without a bot gate
invites scripted queue-saturation. Cloudflare Turnstile raises the cost of scripted abuse
and is free, privacy-first, and usually invisible (no puzzle for real users).

Wiring (already shipped, `web/src/lib/turnstile.ts` + `api/grade/route.ts` +
`components/grade-form.tsx`):
- Server verifies the token before url-guard runs, so a flood without a valid token never
  reaches DNS resolution or the queue.
- Env-gated + enforce-only-when-configured (same shape as `AUDIT_REQUIRE_EGRESS_PROXY`):
  secret unset -> skip; secret set -> deny on missing/invalid token; Cloudflare/network
  error -> **fail closed** (deny), because this is an abuse gate on a public compute
  surface, not the availability rate limit.

Provisioning (owner does this — the agent never holds the secret):
1. Cloudflare dashboard -> Turnstile -> Add widget. Add the production hostname (and
   `localhost` if you want it locally). Copy the **Site Key** (public) and **Secret Key**.
2. Vercel -> the web project -> Settings -> Environment Variables:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = site key, all environments.
   - `TURNSTILE_SECRET_KEY` = secret key, Production (and Preview if you want it enforced
     there), marked Sensitive.
3. Redeploy. Verify: the grade form now shows the widget and a tokenless
   `POST /api/grade` returns 403.

## Monitoring and analytics

Production monitoring should cover both the web app and the async worker path:

- **Vercel runtime:** Sentry is configured for the web project and `NEXT_PUBLIC_SENTRY_DSN`
  is present in production. Vercel runtime logs should stay at zero `error`/`fatal` after
  each deploy.
- **Worker runtime:** the Railway worker reports to the `personaudit-worker` Sentry project.
  Job failures notify through Sentry and `WORKER_ALERT_WEBHOOK` when set. The worker now
  also alerts when `reap_stale_audit_jobs` fails or reaps stuck jobs.
- **Health endpoint:** monitor `https://personaudit.com/api/health`. It returns `200` only
  when Supabase is reachable and no job has been running longer than 15 minutes. It returns
  `503` on missing config, database/queue errors, or stale running jobs.
- **Uptime checks:** at minimum, monitor `https://personaudit.com/`,
  `https://personaudit.com/grade`, and `https://personaudit.com/api/health`. The local
  `hq status --json` service check verifies the UptimeRobot integration token, but `hq`
  does not expose monitor creation.
- **PostHog:** production env has `NEXT_PUBLIC_POSTHOG_KEY` and
  `NEXT_PUBLIC_POSTHOG_HOST`. The client disables autocapture, session recording, surveys,
  feature flags, external dependency loading, and respects Do Not Track. Product events
  intentionally omit emails, notes, grade result tokens, and full submitted URLs.
- **PostHog dashboard:** `Personaudit Activation`
  (`https://us.posthog.com/project/325061/dashboard/2036035`) contains saved insights for
  grade submission conversion, waitlist demand, and signup conversion. The insights will
  populate after the instrumentation is deployed and real browser traffic fires the events.

## Production env inventory

Expected production env names (presence only; never print values):

- Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SENTRY_DSN`,
  `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `ADMIN_EMAILS`,
  `CRON_SECRET`,
  `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`,
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`.
- Railway worker: `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `SENTRY_DSN`,
  `AUDIT_BROWSER_PROXY`, `AUDIT_REQUIRE_EGRESS_PROXY`, and optional
  `WORKER_ALERT_WEBHOOK`, `WORKER_POLL_MS`, `WORKER_JOB_TIMEOUT_SECONDS`,
  `WORKER_REAP_AFTER_SECONDS`, `WORKER_MAX_ATTEMPTS`.

As of the 2026-08-26 Vercel env check, the PostHog, Supabase, Sentry, site URL, and admin
variables are present in production. The Turnstile variables are not present yet.

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
`smokescreen` egress-guard sidecar (`worker/entrypoint.sh`), with explicit deny ranges
for private/reserved destinations and verified locally to deny link-local/metadata
addresses. Both env vars are now set on the
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
