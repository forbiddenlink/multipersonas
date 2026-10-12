import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bearerMatches } from "@/lib/cron-auth";

const STALE_RUNNING_SECONDS = 15 * 60;
const STALE_QUEUED_SECONDS = 15 * 60;
const HEALTH_TIMEOUT_MS = 5000;

// Never cached — a health check must reflect the current state on every hit.
export const dynamic = "force-dynamic";

const PUBLIC_CACHE_MS = 30_000;

interface HealthResult {
  httpStatus: number;
  body: Record<string, unknown>;
}

let publicCache: { at: number; result: Promise<HealthResult> } | null = null;

/**
 * Public callers get the same 200/503 status an uptime monitor needs, with a body that
 * carries no queue counts or service details. The status comes from the same checks as the
 * detailed response, cached in memory for ~30s with concurrent misses sharing one in-flight
 * promise, so anonymous traffic cannot fan out service-role queries.
 *
 * With the CRON_SECRET bearer: the full detail (per-service checks and queue backlog),
 * uncached.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  if (secret && bearerMatches(authorization, secret)) {
    const { httpStatus, body } = await safeHealth();
    return NextResponse.json(body, { status: httpStatus });
  }

  const now = Date.now();
  if (!publicCache || now - publicCache.at >= PUBLIC_CACHE_MS) {
    publicCache = { at: now, result: safeHealth() };
  }
  const { httpStatus } = await publicCache.result;
  return NextResponse.json({ status: httpStatus === 200 ? "ok" : "degraded" }, { status: httpStatus });
}

async function safeHealth(): Promise<HealthResult> {
  try {
    return await checkHealth();
  } catch {
    return degraded({ database: "error", queue: "error" });
  }
}

function degraded(checks: Record<string, string>, extra: Record<string, unknown> = {}): HealthResult {
  return { httpStatus: 503, body: { status: "degraded", checks, ...extra } };
}

async function checkHealth(): Promise<HealthResult> {
  const admin = createAdminClient();
  if (!admin) {
    return degraded({ database: "unconfigured", queue: "unconfigured" });
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
    return degraded({ database: "error", queue: "error" });
  }

  if ((staleRunning.count ?? 0) > 0 || (staleQueued.count ?? 0) > 0) {
    return degraded(
      { database: "ok", queue: (staleRunning.count ?? 0) > 0 ? "stale-running" : "stale-queued" },
      {
        backlog: count ?? 0,
        queued: queued.count ?? 0,
        running: running.count ?? 0,
        staleRunning: staleRunning.count ?? 0,
      },
    );
  }

  return {
    httpStatus: 200,
    body: {
      status: "ok",
      checks: { database: "ok", queue: "ok" },
      backlog: count ?? 0,
      queued: queued.count ?? 0,
      running: running.count ?? 0,
      staleRunning: staleRunning.count ?? 0,
    },
  };
}
