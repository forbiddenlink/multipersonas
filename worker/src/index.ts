import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runMultiPersonaTest, type TestResult } from "multipersonas/orchestrator";
import { personaLibrary } from "multipersonas/personas/library";

// --- config ---------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 3000);

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
}

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
    })),
    conflicts: result.conflicts.map((c) => ({
      description: c.description,
      suggestion: c.suggestion,
    })),
  };
}

type AuditResponse = ReturnType<typeof toResponse>;

/** Persist history for a signed-in user's job: one test_run + its findings, with the
 * axe-vs-persona source split. Best-effort — never fail the job on a history write. */
async function persistHistory(userId: string, audit: AuditResponse): Promise<void> {
  const now = new Date().toISOString();
  const { data: run, error } = await supabase
    .from("test_runs")
    .insert({
      user_id: userId,
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
    return;
  }

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
      page_url: audit.url,
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
        page_url: audit.url,
      })),
    ),
  ];
  if (rows.length > 0) {
    const { error: fErr } = await supabase.from("findings").insert(rows);
    if (fErr) console.error("[worker] history: findings insert failed:", fErr.message);
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
  const tmpDir = path.join(os.tmpdir(), `mp-worker-${claimed.id}`);

  try {
    const personas = claimed.persona_ids
      .map((id) => personaLibrary[id])
      .filter((p) => Boolean(p));

    const result = await runMultiPersonaTest({
      url: claimed.url,
      personas,
      outputDir: tmpDir,
      parallel: true,
      runAxe: true,
    });
    const response = toResponse(result);

    if (claimed.user_id) await persistHistory(claimed.user_id, response);

    await supabase
      .from("audit_jobs")
      .update({ status: "completed", result: response, completed_at: new Date().toISOString() })
      .eq("id", claimed.id);
    console.log(`[worker] completed ${claimed.id}`);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    await supabase
      .from("audit_jobs")
      .update({ status: "failed", error: message, completed_at: new Date().toISOString() })
      .eq("id", claimed.id);
    console.error(`[worker] failed ${claimed.id}: ${message}`);
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
  return true;
}

async function loop(): Promise<void> {
  console.log(`[worker] started; polling every ${POLL_MS}ms`);
  // Run continuously. If a job ran, poll again immediately (drain the queue);
  // otherwise wait POLL_MS before checking again.
  for (;;) {
    let ranSomething = false;
    try {
      ranSomething = await claimAndRun();
    } catch (e) {
      console.error("[worker] loop error:", e instanceof Error ? e.message : e);
    }
    if (!ranSomething) {
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  }
}

void loop();
