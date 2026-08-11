import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";
import * as Sentry from "@sentry/node";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runMultiPersonaTest, type TestResult } from "multipersonas/orchestrator";
import { gradeScan } from "multipersonas/grader";
import { personaLibrary } from "multipersonas/personas/library";

// --- config ---------------------------------------------------------------
// The worker runs personas against URLs strangers supply via POST /api/audit, so
// it must never execute an irreversible "Place Order" / "Confirm Payment" /
// "Delete Account" click on someone else's live site. The engine's action guard is
// opt-in/off-by-default for the CLI (operator owns the target); force it on here so
// the hosted path is safe by construction, regardless of deploy env. `??=` lets an
// operator still override to "0" explicitly if ever needed. See
// src/security/action-guard.ts and src/agent/orchestrator.ts.
process.env.MP_BLOCK_DESTRUCTIVE_ACTIONS ??= "1";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Empty string / NaN / ≤0 → fallback. `Number("") === 0` would otherwise
 * collapse timeouts to instant fail and poll intervals to a busy loop. */
function positiveEnvInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

const POLL_MS = positiveEnvInt(process.env.WORKER_POLL_MS, 3000);
// In-process cap on a single run. A hung Playwright navigation must not freeze the
// whole (single-worker) queue, so the run loses a race against this timeout and the
// job is marked failed.
const JOB_TIMEOUT_MS = positiveEnvInt(process.env.WORKER_JOB_TIMEOUT_SECONDS, 300) * 1000;
// Backstop for a CRASHED worker (where the in-process timeout never fires): the reaper
// only touches jobs stuck well past the in-process cap, so it never races a run the
// worker is itself about to time out.
const REAP_AFTER_SECONDS = positiveEnvInt(process.env.WORKER_REAP_AFTER_SECONDS, 600);
const MAX_ATTEMPTS = positiveEnvInt(process.env.WORKER_MAX_ATTEMPTS, 3);
// Optional alert sink (Slack-compatible incoming webhook) — a lightweight paging path
// alongside Sentry. No-op when unset.
const ALERT_WEBHOOK = process.env.WORKER_ALERT_WEBHOOK;

// Error tracking. No-op until SENTRY_DSN is set on the host, so this ships safely disabled.
// beforeSend redacts app PII (audited target URLs can carry query-string tokens; emails
// may surface in error text) before events leave the process — parallels web/src/lib/
// sentry-scrub.ts (kept inline here since the worker is a separate @sentry/node package).
if (process.env.SENTRY_DSN) {
  const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      for (const v of event.exception?.values ?? []) {
        if (typeof v.value === "string") {
          v.value = v.value.replace(EMAIL_RE, "[email]").replace(/\?[^\s]*/g, "?[redacted]");
        }
      }
      if (typeof event.message === "string") {
        event.message = event.message.replace(EMAIL_RE, "[email]");
      }
      return event;
    },
  });
}

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "[worker] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. Exiting.",
  );
  process.exit(1);
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// --- types (local; the job row + the client-facing response shape) ---------
interface AuditJob {
  id: string;
  user_id: string | null;
  url: string;
  persona_ids: string[];
  status: string;
  project_id: string | null;
  reserved_calls: number;
  kind: string;
}

/** Reject if `promise` doesn't settle within ms. The underlying work keeps running
 * (the orchestrator has no abort signal), so we swallow its late result to avoid an
 * unhandled rejection; the job is already marked failed by then. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  promise.catch(() => {});
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} exceeded ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}

/** Send an alert to WORKER_ALERT_WEBHOOK if configured. Best-effort and never throws —
 * an alert-path failure must not take down the worker. */
async function notify(text: string): Promise<void> {
  if (!ALERT_WEBHOOK) return;
  try {
    await fetch(ALERT_WEBHOOK, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: `[personaudit worker] ${text}` }),
    });
  } catch (e) {
    console.error("[worker] alert webhook failed:", e instanceof Error ? e.message : e);
  }
}

/** Refund a failed job's reserved model-call budget. Best-effort — a release failure
 * (e.g. migration 013 not yet applied) is logged, not thrown; the daily counter
 * self-heals at UTC midnight. */
async function releaseReservation(job: AuditJob): Promise<void> {
  if (!job.reserved_calls) return;
  const { error } = await supabase.rpc("release_model_calls", { p_calls: job.reserved_calls });
  if (error) console.error(`[worker] release_model_calls failed for ${job.id}: ${error.message}`);
}

/**
 * Stable message safe to return on public capability URLs (grade token / job poll).
 * Full exception text is logged + sent to Sentry; never write paths/DNS details to the DB.
 */
function publicJobError(e: unknown): string {
  const message = e instanceof Error ? e.message : "";
  if (/exceeded \d+ms/i.test(message) || /timed? ?out/i.test(message)) {
    return "The scan timed out. Try again, or try a smaller site.";
  }
  if (/no valid personas/i.test(message)) {
    return "No valid personas were configured for this audit.";
  }
  return "The scan failed. Please try again.";
}

// Graceful shutdown: on a container redeploy (SIGTERM) or Ctrl-C (SIGINT), stop
// claiming new work and let the current job finish (or hit its timeout) rather than
// being SIGKILLed mid-run and stranded. The reaper covers a hard kill.
let shuttingDown = false;
for (const sig of ["SIGTERM", "SIGINT"] as const) {
  process.on(sig, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[worker] ${sig} received — finishing current job, then exiting.`);
  });
}

// Last-resort crash handlers. The job and loop try/catch blocks report their own
// failures, but a throw or rejected promise OUTSIDE them (module init, a stray timer,
// an unawaited promise) would otherwise vanish with no Sentry signal. Capture, alert,
// flush, then exit so the process manager restarts a clean worker instead of one left
// in a half-dead state.
const onFatal = (evt: string) => (err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(`[worker] ${evt}:`, detail);
  Sentry.captureException(err, { tags: { fatal: evt } });
  void (async () => {
    try {
      await notify(`worker ${evt}: ${detail}`);
      await Sentry.flush(2000);
    } finally {
      process.exit(1);
    }
  })();
};
process.on("uncaughtException", onFatal("uncaughtException"));
process.on("unhandledRejection", onFatal("unhandledRejection"));

const SEVERITIES = ["critical", "serious", "moderate", "minor"];
const CATEGORIES = ["accessibility", "usability", "performance", "content"];
const clampSeverity = (s: string) => (SEVERITIES.includes(s) ? s : "moderate");
const clampCategory = (c: string) => (CATEGORIES.includes(c) ? c : "usability");

/** Build the client-facing response (no file paths), mirroring the old inline route. */
function toResponse(result: TestResult) {
  return {
    url: result.url,
    taskSuccess: result.taskSuccess,
    personas: result.personas.map((pr) => ({
      id: pr.persona.id,
      name: pr.persona.name,
      description: pr.persona.description,
      goalCompleted: pr.agentResult.goalCompleted,
      totalSteps: pr.agentResult.totalSteps,
      statesReached: pr.agentResult.pagesVisited.length,
      findings: pr.agentResult.findings.map((f) => ({
        severity: f.severity,
        category: f.category,
        title: f.title,
        description: f.description,
        recommendation: f.recommendation,
        location: f.pageUrl,
      })),
    })),
    axeFindings: result.axeFindings.map((f) => ({
      severity: f.severity,
      title: f.title,
      description: f.description,
      recommendation: f.recommendation,
      // seenOn holds every state the defect was de-duped across; fall back to
      // pageUrl for the (rare) finding that never went through that grouping.
      location: f.seenOn && f.seenOn.length > 0 ? f.seenOn.join(", ") : f.pageUrl,
      // Carried for the Report export (VPAT-lite): the axe rule id + its WCAG tags
      // let the report cite success criteria. null for the odd finding lacking them.
      ruleId: f.ruleId ?? null,
      wcagTags: f.wcagTags ?? null,
      // CSS selector — same identity key the CLI baseline gate uses (ruleId|target).
      target: f.target ?? null,
    })),
    conflicts: result.conflicts.map((c) => ({
      description: c.description,
      suggestion: c.suggestion,
    })),
  };
}

type AuditResponse = ReturnType<typeof toResponse>;

/** Persist history for a signed-in user's job: one test_run + its findings, with the
 * axe-vs-persona source split. Best-effort — never fail the job on a history write.
 * `projectId` links the run to a project when the audit was queued from one — see
 * app/api/audit/route.ts, which verifies ownership before it ever reaches a job row. */
async function persistHistory(
  userId: string,
  audit: AuditResponse,
  projectId?: string | null,
): Promise<string | null> {
  const now = new Date().toISOString();
  const { data: run, error } = await supabase
    .from("test_runs")
    .insert({
      user_id: userId,
      project_id: projectId ?? null,
      url: audit.url,
      status: "completed",
      task_success_achieved: audit.taskSuccess.achieved,
      task_success_total: audit.taskSuccess.total,
      persona_ids: audit.personas.map((p) => p.id),
      started_at: now,
      completed_at: now,
    })
    .select("id")
    .single();

  if (error || !run) {
    console.error("[worker] history: test_run insert failed:", error?.message);
    return null;
  }

  // `location` already carries the specific page each finding was seen on (see
  // toResponse: axe's seenOn/pageUrl and persona's pageUrl) — falling back to the
  // top-level audit URL here collapsed every finding onto the entry page.
  const rows = [
    ...audit.axeFindings.map((f) => ({
      test_run_id: run.id,
      persona_id: "axe",
      source: "axe",
      severity: clampSeverity(f.severity),
      category: "accessibility",
      title: f.title,
      description: f.description,
      recommendation: f.recommendation,
      page_url: f.location || audit.url,
      rule_id: f.ruleId,
      wcag_tags: f.wcagTags,
      target: f.target,
    })),
    ...audit.personas.flatMap((p) =>
      p.findings.map((f) => ({
        test_run_id: run.id,
        persona_id: p.id,
        source: "persona",
        severity: clampSeverity(f.severity),
        category: clampCategory(f.category),
        title: f.title,
        description: f.description,
        recommendation: f.recommendation,
        page_url: f.location || audit.url,
      })),
    ),
  ];
  if (rows.length > 0) {
    const { error: fErr } = await supabase.from("findings").insert(rows);
    if (fErr) console.error("[worker] history: findings insert failed:", fErr.message);
  }
  return run.id;
}

/** Persist the persona walk for Persona Replay Theater: upload each step's screenshot to
 * the private `journeys` bucket and write one journey_steps row per (persona, step). The
 * screenshot + the persona's inner-monologue reasoning are what make the run replayable.
 *
 * Best-effort — a failure here (bucket/table not yet created, a missing frame) is logged,
 * never fatal to the job. Worker scans are UNAUTHENTICATED, so every frame is of a PUBLIC
 * page; behind-login capture stays opt-in + private when it lands (see migration 014). */
async function persistJourney(runId: string, result: TestResult): Promise<void> {
  for (const pr of result.personas) {
    for (const s of pr.agentResult.steps) {
      const nnn = String(s.step).padStart(3, "0");
      let screenshotPath: string | null = null;

      // Upload the frame if it is still on disk (the run's tmp dir is cleaned right after).
      if (s.screenshotPath && fs.existsSync(s.screenshotPath)) {
        const objectPath = `${runId}/${pr.persona.id}/step-${nnn}.png`;
        try {
          const bytes = fs.readFileSync(s.screenshotPath);
          const { error: upErr } = await supabase.storage
            .from("journeys")
            .upload(objectPath, bytes, { contentType: "image/png", upsert: true });
          if (upErr) {
            console.error(`[worker] journey: upload ${objectPath} failed: ${upErr.message}`);
          } else {
            screenshotPath = objectPath;
          }
        } catch (e) {
          console.error(
            `[worker] journey: read/upload ${objectPath} failed:`,
            e instanceof Error ? e.message : e,
          );
        }
      }

      const { error: rowErr } = await supabase.from("journey_steps").upsert(
        {
          test_run_id: runId,
          persona_id: pr.persona.id,
          step: s.step,
          action: s.action,
          detail: s.detail || null,
          reasoning: s.reasoning ?? null,
          goal_completed: pr.agentResult.goalCompleted,
          page_url: s.pageUrl || null,
          screenshot_path: screenshotPath,
          ts: new Date(s.timestamp).toISOString(),
        },
        { onConflict: "test_run_id,persona_id,step" },
      );
      if (rowErr) {
        console.error(`[worker] journey: step insert failed (${runId}): ${rowErr.message}`);
        // A row failure usually means the migration isn't applied yet — stop hammering.
        return;
      }
    }
  }
}

async function claimAndRun(): Promise<boolean> {
  const { data: job, error } = await supabase.rpc("claim_audit_job");
  if (error) {
    console.error("[worker] claim failed:", error.message);
    return false;
  }
  const claimed = job as AuditJob | null;
  if (!claimed || !claimed.id) return false; // empty queue

  console.log(`[worker] claimed ${claimed.id} — ${claimed.url}`);

  // Public grader jobs (kind='grade') are axe-only: no personas, no model spend,
  // no session, results to the public grader_scans row. Handled inline then done.
  if (claimed.kind === "grade") {
    await supabase.from("grader_scans").update({ status: "running" }).eq("job_id", claimed.id);
    try {
      const { report, pagesVisited } = await withTimeout(
        gradeScan(claimed.url, { maxPages: 10 }),
        JOB_TIMEOUT_MS,
        `grade ${claimed.id}`,
      );
      await supabase
        .from("grader_scans")
        .update({ status: "completed", report, pages_visited: pagesVisited })
        .eq("job_id", claimed.id);
      await supabase
        .from("audit_jobs")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", claimed.id);
      console.log(`[worker] graded ${claimed.id}`);
    } catch (e) {
      const detail = e instanceof Error ? e.message : "Unknown error";
      const publicMsg = publicJobError(e);
      await supabase
        .from("grader_scans")
        .update({ status: "failed", error: publicMsg })
        .eq("job_id", claimed.id);
      await supabase
        .from("audit_jobs")
        .update({ status: "failed", error: publicMsg, completed_at: new Date().toISOString() })
        .eq("id", claimed.id);
      Sentry.captureException(e, { tags: { jobId: claimed.id, kind: "grade" } });
      console.error(`[worker] grade failed ${claimed.id}: ${detail}`);
      await notify(`grade ${claimed.id} failed: ${detail}`);
    }
    return true; // grade jobs reserve no spend — no releaseReservation needed
  }

  const tmpDir = path.join(os.tmpdir(), `mp-worker-${claimed.id}`);

  try {
    const personas = claimed.persona_ids
      .map((id) => personaLibrary[id])
      .filter((p) => Boolean(p));

    if (personas.length === 0) {
      throw new Error(
        `No valid personas for job ${claimed.id} (requested: ${claimed.persona_ids.join(", ") || "none"})`,
      );
    }

    const result = await withTimeout(
      runMultiPersonaTest({
        url: claimed.url,
        personas,
        outputDir: tmpDir,
        parallel: true,
        runAxe: true,
      }),
      JOB_TIMEOUT_MS,
      `job ${claimed.id}`,
    );
    const response = toResponse(result);

    if (claimed.user_id) {
      const runId = await persistHistory(claimed.user_id, response, claimed.project_id);
      // Replay Theater: persist the walk while the screenshots are still on disk (the
      // finally block wipes tmpDir). Best-effort; `result` carries the per-step records.
      if (runId) await persistJourney(runId, result);
    }

    await supabase
      .from("audit_jobs")
      .update({ status: "completed", result: response, completed_at: new Date().toISOString() })
      .eq("id", claimed.id);
    console.log(`[worker] completed ${claimed.id}`);
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown error";
    const publicMsg = publicJobError(e);
    await supabase
      .from("audit_jobs")
      .update({ status: "failed", error: publicMsg, completed_at: new Date().toISOString() })
      .eq("id", claimed.id);
    // Refund the budget this failed run reserved (P0 #3) so a run of failures can't
    // fill the daily cap and refuse legitimate audits.
    await releaseReservation(claimed);
    Sentry.captureException(e, { tags: { jobId: claimed.id } });
    console.error(`[worker] failed ${claimed.id}: ${detail}`);
    await notify(`job ${claimed.id} failed: ${detail}`);
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
  return true;
}

/** Requeue/dead-letter jobs a crashed worker left stuck in 'running' (P0 #2). */
async function reapStaleJobs(): Promise<void> {
  const { data, error } = await supabase.rpc("reap_stale_audit_jobs", {
    p_timeout_seconds: REAP_AFTER_SECONDS,
    p_max_attempts: MAX_ATTEMPTS,
  });
  if (error) {
    console.error(`[worker] reap failed: ${error.message}`);
  } else if (typeof data === "number" && data > 0) {
    console.log(`[worker] reaped ${data} stale job(s)`);
  }
}

async function loop(): Promise<void> {
  console.log(`[worker] started; polling every ${POLL_MS}ms`);
  // Run continuously. If a job ran, poll again immediately (drain the queue);
  // otherwise reap stranded jobs and wait POLL_MS before checking again.
  while (!shuttingDown) {
    let ranSomething = false;
    try {
      ranSomething = await claimAndRun();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Sentry.captureException(e);
      console.error("[worker] loop error:", msg);
      await notify(`loop error: ${msg}`);
    }
    if (!ranSomething) {
      await reapStaleJobs();
      if (shuttingDown) break;
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  }
  console.log("[worker] stopped.");
  process.exit(0);
}

void loop();
