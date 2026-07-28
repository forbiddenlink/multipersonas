# Personaudit — System Architecture

Snapshot as of 2026-07-28. Written against `main` (HEAD at read time). Regenerate if the
web→queue→worker split or the security chokepoints change.

Two deploy surfaces share one Supabase project (`vsqglpanxeqbnvuyzbmo`): the **web app**
on Vercel (thin, serverless — no browser) and the **worker** on Railway (persistent,
runs Chromium + the engine). They never call each other directly; the `audit_jobs` queue
is the only coupling.

```mermaid
graph TB
  user([User / anon])

  subgraph vercel["Web — Vercel (personaudit.com)"]
    landing["Next.js app<br/>landing, /for-agencies,<br/>dashboard, /audits, /waitlist"]
    postAudit["POST /api/audit<br/>(enqueue only)"]
    pollAudit["GET /api/audit/[jobId]<br/>(poll, capability URL)"]
    waitlist["POST /api/waitlist"]
  end

  subgraph gates["Enqueue gates (in POST /api/audit, order matters)"]
    ks["kill switch<br/>AUDIT_KILL_SWITCH"]
    url["url-guard<br/>assertUrlAllowed()<br/>SSRF: judges resolved IPs"]
    rl["durable rate limit<br/>consumeRateLimit()"]
    sp["spend cap<br/>reserveSpend()"]
  end

  subgraph supabase["Supabase (Postgres)"]
    jobs[("audit_jobs<br/>queue")]
    runs[("test_runs +<br/>findings (history)")]
    wl[("waitlist")]
    rlrpc["RPCs: consume_rate_limit,<br/>reserve_model_calls,<br/>claim_audit_job (skip-locked)"]
  end

  subgraph railway["Worker — Railway (persistent)"]
    loop["poll loop<br/>claim_audit_job every 3s"]
    engine["engine: runMultiPersonaTest<br/>Chromium + axe-core + persona agents"]
    anthropic["Anthropic API<br/>(persona LLM calls)"]
  end

  user --> landing
  landing --> postAudit
  postAudit --> ks --> url --> rl --> sp
  sp -->|"service client insert"| jobs
  postAudit -.->|"202 {jobId}"| user
  rl -.-> rlrpc
  sp -.-> rlrpc

  loop -->|"claim (service role)"| jobs
  loop --> engine
  engine --> anthropic
  engine -->|"result + status"| jobs
  engine -->|"if signed-in: persist"| runs

  user --> pollAudit -->|"read by UUID"| jobs
  landing --> waitlist --> wl

  classDef sec fill:#7c2d12,stroke:#f97316,color:#fff;
  class ks,url,rl,sp sec;
```

## Load-bearing facts

- **The web route never runs a browser.** Vercel serverless has no Chromium and blows the
  size/time limits. `POST /api/audit` only validates + enqueues, returns `202 {jobId}`.
  `worker/src/index.ts` is the only place the browser runs.
- **Enqueue gate order** (`web/src/app/api/audit/route.ts`): kill switch → rate limit →
  URL guard → spend reserve → insert. All durable in Postgres (not in-process) so they
  hold across serverless instances.
- **`url-guard.ts` is the SSRF chokepoint** — resolves the hostname and judges the
  resolved addresses (blocks link-local, RFC1918, `metadata.google.internal`,
  `[::ffff:169.254.169.254]`). The engine re-checks every navigation, so this is the
  outer gate, not the only one. `--allow-private` is CLI-only and must NEVER be set on the
  hosted path.
- **Anon jobs are capability URLs.** `audit_jobs` has no client insert/update policy;
  owners read their own via RLS, anon reads only through the service-backed poll endpoint
  keyed by the unguessable UUID.
- **Residual security gap:** the Railway worker has no egress firewall — url-guard is the
  mitigation, DNS-rebinding is the residual. Blocker before fully-public-anon. See
  `docs/DEPLOYMENT.md`.
