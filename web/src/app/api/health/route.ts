import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const STALE_RUNNING_SECONDS = 15 * 60;
const STALE_QUEUED_SECONDS = 15 * 60;
const HEALTH_TIMEOUT_MS = 5000;

// Never cached — a health check must reflect the current state on every hit.
export const dynamic = "force-dynamic";

/**
 * Liveness + dependency health for an uptime monitor. Checks the two things the audit
 * path depends on: the database and the job queue. Returns 200 only when both are
 * reachable; 503 otherwise so a monitor can alert. Deliberately leaks no data — just
 * a status per dependency and the current queue backlog (a useful stuck-worker signal).
 */
export async function GET() {
  try {
    return await checkHealth();
  } catch {
    return NextResponse.json(
      { status: "degraded", checks: { database: "error", queue: "error" } },
      { status: 503 },
    );
  }
}

async function checkHealth() {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { status: "degraded", checks: { database: "unconfigured", queue: "unconfigured" } },
      { status: 503 },
    );
  }

  const signal = AbortSignal.timeout(HEALTH_TIMEOUT_MS);
  const [{ error, count }, queued, running, staleRunning, staleQueued] = await Promise.all([
    admin
      .from("audit_jobs")
      .select("id", { count: "exact", head: true })
      .in("status", ["queued", "running"])
      .abortSignal(signal),
    admin
      .from("audit_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "queued")
      .abortSignal(signal),
    admin
      .from("audit_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "running")
      .abortSignal(signal),
    admin
      .from("audit_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "running")
      .lt("started_at", new Date(Date.now() - STALE_RUNNING_SECONDS * 1000).toISOString())
      .abortSignal(signal),
    admin
      .from("audit_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "queued")
      .lt("created_at", new Date(Date.now() - STALE_QUEUED_SECONDS * 1000).toISOString())
      .abortSignal(signal),
  ]);

  const queueError = error ?? queued.error ?? running.error ?? staleRunning.error ?? staleQueued.error;
  if (queueError) {
    return NextResponse.json(
      { status: "degraded", checks: { database: "error", queue: "error" } },
      { status: 503 },
    );
  }

  if ((staleRunning.count ?? 0) > 0 || (staleQueued.count ?? 0) > 0) {
    return NextResponse.json(
      {
        status: "degraded",
        checks: { database: "ok", queue: (staleRunning.count ?? 0) > 0 ? "stale-running" : "stale-queued" },
        backlog: count ?? 0,
        queued: queued.count ?? 0,
        running: running.count ?? 0,
        staleRunning: staleRunning.count ?? 0,
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      status: "ok",
      checks: { database: "ok", queue: "ok" },
      backlog: count ?? 0,
      queued: queued.count ?? 0,
      running: running.count ?? 0,
      staleRunning: staleRunning.count ?? 0,
    },
    { status: 200 },
  );
}
