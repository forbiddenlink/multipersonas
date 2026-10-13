# Runbook

Snapshot as of 2026-10-12 (written against `origin/main` at `d7eba09`). Facts cite code
paths. Anything this repo cannot show is marked **UNKNOWN**: confirm it in the named
dashboard and write the answer here.

Context: `main` auto-deploys to production through Vercel's git integration, and no step in
that deploy applies database migrations (`docs/DEPLOYMENT.md`, "Deploy model"). Treat every
merge as a release.

## Triage in two minutes

1. Open `https://personaudit.com/api/health`. It returns `200` only when Supabase is
   reachable and no audit job has been queued or running longer than 15 minutes
   (`web/src/app/api/health/route.ts`, `STALE_RUNNING_SECONDS` and `STALE_QUEUED_SECONDS`).
   `503` means config, database, queue, or worker trouble.
2. Decide which half is broken.
   - Web pages or API routes failing: Vercel runtime logs and the web Sentry project.
     Go to "Roll back the web app".
   - Jobs stuck in `queued`: the worker is down or wedged. Go to "Worker and stuck jobs".
   - Money or model spend running away: go to "Kill switch" first, then investigate.
   - Checkout or Pro access wrong: go to "Stripe webhook".
3. Note the time you started and what you changed. Write it down in the incident issue.

## Kill switch

`AUDIT_KILL_SWITCH` set to `1` or `true` makes these endpoints return `503` with
`Retry-After: 3600`:

- `POST /api/audit` (`web/src/app/api/audit/route.ts:25`)
- `POST /api/grade` (`web/src/app/api/grade/route.ts:18`)
- `/api/schedules/run-due` (`web/src/app/api/schedules/run-due/route.ts:22`)

The flag is read from the environment (`web/src/lib/limits.ts:59`), so **changing it needs a
redeploy**: set it in Vercel -> the web project -> Settings -> Environment Variables
(Production), then redeploy. It does not stop jobs already in the queue or running on the
worker. To stop those too, see "Drain or pause the worker".

To end the freeze, remove the variable (or set it to `0`) and redeploy.

Cheaper first moves when the problem is spend, not an attack: lower `AUDIT_DAILY_CALL_CAP`
(default 5000) or `AUDIT_CALLER_DAILY_CALL_CAP` (default 250). These are also env vars and
also need a redeploy.

## Roll back the web app

Vercel keeps previous production deployments. Prefer a rollback over a hot revert when users
are affected, then fix forward in git.

1. Vercel dashboard -> the web project -> Deployments. Pick the last known-good production
   deployment and use **Instant Rollback** (or **Promote**). CLI equivalent:
   `vercel rollback <deployment-url>` with the explicit team and project from
   `.vercel/project.json`; do not rely on the CLI's default account.
2. Check `https://personaudit.com/api/health` and run `node scripts/prod-smoke.mjs`.
3. Expect two side effects (confirm against Vercel's current docs): a rollback may turn off
   automatic assignment of new `main` deployments to the production domain until you promote
   again, and environment variables are fixed per deployment, so the old deployment keeps its
   old values. A later push to `main` therefore may not go live until you re-enable it.
4. Rollback target retention and how many deployments are kept: **UNKNOWN** (plan-dependent).
5. If the bad release came with a migration, rolling back the code does not undo the schema.
   See "Database".

Then revert or fix the offending commit on `main`. Reverting does not need a special path: the
merge deploys like any other.

## Roll back the worker

The worker runs on Railway as service `multipersonas-worker`, built from `worker/Dockerfile`
via `.railway/railway.ts` (single replica, restart `on_failure`, max 10 retries).

1. Railway dashboard -> the service -> Deployments -> choose the previous successful
   deployment -> **Redeploy**. Or `railway redeploy` after `railway link`.
2. Watch `railway logs` for smokescreen's `[INFO] starting` and then
   `[worker] started; polling every 3000ms`. If the egress proxy line is missing, the worker
   refuses to launch the browser (`AUDIT_REQUIRE_EGRESS_PROXY=1`), by design.
3. Do not set the service's start command by hand. `.railway/railway.ts` must keep
   `start: "/usr/local/bin/entrypoint.sh"`, which starts smokescreen before the worker.
4. Do not roll back only the worker while saved-task jobs are queued: an older worker cannot
   process task snapshots or version 2 task checks (`docs/DEPLOYMENT.md`, "Saved project
   tasks rollout" and "September 23, 2026 release"). Pause admission first (kill switch).

## Worker and stuck jobs

Jobs live in `audit_jobs`. The worker claims them with `claim_audit_job()` (skip-locked) and
reaps stuck ones itself.

- Every `WORKER_REAP_INTERVAL_SECONDS` (default 60) the loop calls `reap_stale_audit_jobs`
  (`worker/src/index.ts:440-470`; latest definition in
  `web/supabase/migrations/026_retain_started_job_spend.sql`).
- A job `running` longer than `WORKER_REAP_AFTER_SECONDS` (default 600) is put back to
  `queued` if it has used fewer than `WORKER_MAX_ATTEMPTS` (default 3) attempts. Past that it
  is marked failed and its reserved model calls are released.
- Each job also has its own timeout, `WORKER_JOB_TIMEOUT_SECONDS` (default 300).
- When the reaper recovers jobs or fails, the worker reports to the `personaudit-worker`
  Sentry project and posts to `WORKER_ALERT_WEBHOOK` if set.

If `/api/health` stays `503` for stale queued jobs, the worker is probably offline:

1. `railway logs` for crash loops (restart policy gives up after 10 retries).
2. Redeploy the service (see above).
3. Confirm the queue drains and `/api/health` returns `200`.

If one job keeps failing, read its `error` and `attempts` in `audit_jobs` through the Supabase
SQL editor (read-only query). Do not hand-edit job rows in production without writing down
the change; the spend counters (`reserve_model_calls`, `release_model_calls`) move with them.

### Drain or pause the worker

To stop new work reaching the worker, enable the kill switch (redeploy needed). Let running
jobs finish or let the reaper settle them. To stop the worker itself, scale or stop the
Railway service from its dashboard.

## Stripe webhook

Endpoint: `POST https://personaudit.com/api/stripe/webhook`
(`web/src/app/api/stripe/webhook/route.ts`). Subscribed events are listed in
`docs/DEPLOYMENT.md` ("Founding checkout").

Behavior to rely on:

- A bad or missing signature returns `400` (route lines 41-48).
- A failed profile update, or one that matches no profile, returns `500` (line 85), so Stripe
  retries on its own schedule.

To replay: Stripe dashboard -> Developers -> Webhooks -> the endpoint -> the failed event ->
**Resend**. Do this only after the cause is fixed (service-role key set, migration applied),
or the replay fails the same way. Never print or paste the signing secret; it is
`STRIPE_WEBHOOK_SECRET` in Vercel.

Do not delete an ambiguous checkout reservation in `checkout_attempts` just to let a customer
retry; reconcile it against Stripe first (`docs/DEPLOYMENT.md`, "Checkout reservation").

To stop new purchases quickly, remove `NEXT_PUBLIC_FOUNDING_CHECKOUT_URL` and redeploy:
the checkout gate requires it (`docs/DEPLOYMENT.md`, "Founding checkout").

## Database

Migrations in `web/supabase/migrations/` are applied by hand and are forward-only: there are
no down scripts.

- **Bad migration or bad data write.** Two options: fix forward with a new migration, or
  restore from a point-in-time backup. Never restore over production as a drill.
- **Backups (checked 2026-10-12 with `supabase backups list`):** point-in-time recovery is
  **off** (`pitr_enabled: false`). Supabase takes one physical backup a day at about
  05:00 UTC, and 8 were listed, so the worst-case data loss is about 24 hours. Restoring
  means picking a daily backup in the dashboard (Database -> Backups). PITR is a paid
  add-on; turning it on is a cost decision. A hosted restore has never been tested;
  only a local dump and restore passed on 2026-09-29 (`docs/DEPLOYMENT.md`, checklist).
  Restore time: UNKNOWN until a restore is rehearsed into a separate project.
- **Release skew.** Because a merge deploys web without applying migrations, a missing
  migration shows up as runtime errors on the new routes. Apply the migration (see
  "Migration rollout order" in `docs/DEPLOYMENT.md`), no code rollback needed.
- Do not run `supabase config push`. `web/supabase/config.toml` still holds local-dev auth
  values that would overwrite production settings (`docs/DEPLOYMENT.md`, checklist).

## Other outages

- **Supabase down:** `/api/health` returns `503`; rate limiting and spend caps depend on it.
  Without `SUPABASE_SERVICE_ROLE_KEY` the limiter allows and warns, so do not "fix" an outage
  by unsetting it. Status page: https://status.supabase.com.
- **Resend (email) down:** scheduled-scan emails stop; `/api/schedules/notify` returns `503`
  when `RESEND_API_KEY` or `SCAN_EMAIL_FROM` is unset. Jobs themselves are unaffected.
- **Turnstile down:** the grader fails closed and denies requests when Cloudflare is
  unreachable (`web/src/lib/turnstile.ts`, `docs/DEPLOYMENT.md`).
- **Anthropic API down or quota exhausted:** `run` and persona jobs fail; `scan` and the free
  grader are axe-only and do not call a model.

## Who gets alerted and who responds

| Signal | Where it goes | Status |
| --- | --- | --- |
| Web exceptions | Sentry (web project, `NEXT_PUBLIC_SENTRY_DSN`) | Configured; who is notified: UNKNOWN |
| Worker exceptions and reaper activity | Sentry project `personaudit-worker`, plus `WORKER_ALERT_WEBHOOK` | Webhook destination: UNKNOWN |
| Uptime | UptimeRobot HTTP monitor `804247766` on `https://personaudit.com/api/health`, every 5 minutes (public 200 = ok, 503 = degraded web, database or worker queue) | Created 2026-10-12; alerts go to the account email contact. |
| Stripe delivery failures | Stripe dashboard email | UNKNOWN |
| Dependabot and CI | GitHub notifications | Owner's account |
| On-call or backup responder | None documented | UNKNOWN. This is a solo project; there is no secondary |
| Public status page | None | Does not exist |

Close these gaps by filling in the UNKNOWN cells after checking each dashboard.

## After the incident

1. Write what happened, the timeline, and the fix in a GitHub issue, then close it. A
   closed issue reads as history; a living markdown file drifts.
2. If the cause was a missing migration, an env var, or an unpinned tool, add the check that
   would have caught it (for example `scripts/check-prod-env.mjs` or a CI step).
3. Update the UNKNOWN cells above that you resolved.
