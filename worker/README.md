# Audit worker

Claims queued `audit_jobs`, runs the browser + engine, and writes the result back. This
is the persistent process the Vercel app cannot be (no Chromium in a serverless route —
see `docs/DEPLOYMENT.md`).

## Flow

```
web /api/audit ──insert audit_jobs (queued)──> Postgres
                                                   │  claim_audit_job() (skip-locked)
worker (this) ──claims──> runMultiPersonaTest ──> writes result + history ──> audit_jobs (completed)
web /api/audit/[jobId] ──polls──> Postgres
```

## Environment

- `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) — the project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — required. The worker claims/updates jobs and writes
  history with the service role (bypasses RLS). Server-side secret; never ship to a client.
- `ANTHROPIC_API_KEY` — persona runs are model calls.
- `WORKER_POLL_MS` — optional, default 3000. Idle poll interval; the queue drains
  back-to-back when busy.

## Run locally

```bash
# from the repo root, once — the worker imports the built engine
pnpm --filter multipersonas build
# then run the worker (needs the env vars above in your shell / .env)
pnpm --filter worker start        # or: dev (watch)
```

## Deploy

Build the image from the repo root with this Dockerfile and run it on any container host:

```bash
docker build -f worker/Dockerfile -t multipersonas-worker .
docker run --rm -e SUPABASE_URL=... -e SUPABASE_SERVICE_ROLE_KEY=... -e ANTHROPIC_API_KEY=... multipersonas-worker
```

**Network isolation (deploy blocker #3):** run the worker where its egress can deny
link-local + RFC1918 by default. Browserbase provides this; a raw container host needs an
egress firewall configured. Until that is in place, do not point the worker at
attacker-supplied URLs on a network with reachable internal services. See
`docs/PLAN-2026-07-26-phase2-deploy-infra.md` (P2-C).
