# Personaudit — Audit Job Lifecycle

Snapshot as of 2026-07-28. The async submit→worker→poll loop that every session
re-derives. Source: `web/src/app/api/audit/route.ts`, `web/src/app/api/audit/[jobId]/route.ts`,
`worker/src/index.ts`, migration `005_audit_jobs_queue.sql`.

```mermaid
sequenceDiagram
  actor U as User (browser)
  participant W as Web (Vercel)
  participant DB as Supabase (audit_jobs)
  participant K as Worker (Railway)
  participant AI as Anthropic

  U->>W: POST /api/audit { url, personaIds }
  Note over W: kill switch → rate limit →<br/>url-guard → reserve spend
  alt any gate fails
    W-->>U: 429 / 400 / 503 (refuse)
  else all pass
    W->>DB: insert audit_jobs (status=queued)
    W-->>U: 202 { jobId, status: "queued" }
  end

  Note over U: audit-form persists jobId to<br/>sessionStorage + ?job= (survives reload)

  loop worker poll every 3s
    K->>DB: rpc claim_audit_job() [skip-locked]
    alt job claimed
      DB-->>K: job row (status→running)
      K->>K: runMultiPersonaTest<br/>Chromium + axe + personas (parallel)
      K->>AI: persona agent calls
      AI-->>K: navigation decisions + opinions
      alt success
        K->>DB: update status=completed, result=jsonb
        opt signed-in user
          K->>DB: insert test_runs + findings (axe|persona split)
        end
      else error thrown
        K->>DB: update status=failed, error=message
      end
    else empty queue
      DB-->>K: null row → wait POLL_MS
    end
  end

  loop client polls until terminal
    U->>W: GET /api/audit/[jobId]
    W->>DB: read job by UUID
    DB-->>W: { status, result? }
    W-->>U: status queued→running→completed/failed
  end

  Note over U: on completed → render axe verdicts +<br/>per-persona task-success + locations
```

## States

`queued` → `running` → (`completed` | `failed`). Terminal = `completed`/`failed`.
`claim_audit_job` is `security definer`, `for update skip locked`, revoked from
anon/authenticated — only the service-role worker can claim. `attempts` increments on
each claim (no auto-retry wired yet; a failed job stays failed).

## Non-obvious behaviors

- **Anon-scan survives reload:** jobId is written to `sessionStorage` + `?job=`; the form
  resumes polling on mount. A timeout keeps the job and shows "Check status" re-poll that
  never re-consumes quota.
- **History is best-effort:** `persistHistory` failures never fail the job. Only signed-in
  jobs get `test_runs`/`findings` rows; anon results live only in `audit_jobs.result`.
- **Findings carry a source split:** `source = 'axe' | 'persona'` — axe = compliance
  verdict, persona = navigation opinion. Never blurred (CONTEXT.md).
