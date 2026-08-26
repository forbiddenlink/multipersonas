import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const STALE_RUNNING_SECONDS = 15 * 60;

// Never cached — a health check must reflect the current state on every hit.
export const dynamic = "force-dynamic";

/**
 * Liveness + dependency health for an uptime monitor. Checks the two things the audit
 * path depends on: the database and the job queue. Returns 200 only when both are
 * reachable; 503 otherwise so a monitor can alert. Deliberately leaks no data — just
 * a status per dependency and the current queue backlog (a useful stuck-worker signal).
 */
export async function GET() {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { status: "degraded", checks: { database: "unconfigured", queue: "unconfigured" } },
      { status: 503 },
    );
  }

  const [{ error, count }, queued, running, staleRunning] = await Promise.all([
    admin
    .from("audit_jobs")
    .select("id", { count: "exact", head: true })
      .in("status", ["queued", "running"]),
    admin
      .from("audit_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "queued"),
    admin
      .from("audit_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "running"),
    admin
      .from("audit_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "running")
      .lt("started_at", new Date(Date.now() - STALE_RUNNING_SECONDS * 1000).toISOString()),
  ]);

  const queueError = error ?? queued.error ?? running.error ?? staleRunning.error;
  if (queueError) {
    return NextResponse.json(
      { status: "degraded", checks: { database: "error", queue: "error" } },
      { status: 503 },
    );
  }

  if ((staleRunning.count ?? 0) > 0) {
    return NextResponse.json(
      {
        status: "degraded",
        checks: { database: "ok", queue: "stale-running" },
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
