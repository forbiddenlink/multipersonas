import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { assertUrlAllowed, BlockedUrlError } from "@engine/security/url-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { killSwitchEnabled, positiveEnvInt, RATE_LIMITS } from "@/lib/limits";
import { getClientIP } from "@/lib/client-ip";
import { verifyTurnstile } from "@/lib/turnstile";
import { logAuditEvent } from "@/lib/audit-log";

// Public accessibility grader: anonymous, axe-only, no model spend. Enqueues a
// kind='grade' job onto the shared audit_jobs queue; the worker runs gradeScan and
// writes the public grader_scans row this returns a token for.

const MAX_QUEUED_GRADES = positiveEnvInt(process.env.GRADE_QUEUE_CAP, 25);

export async function POST(request: Request) {
  if (killSwitchEnabled()) {
    return NextResponse.json(
      { error: "Grading is temporarily unavailable." },
      { status: 503, headers: { "Retry-After": "3600" } },
    );
  }

  let body: { url?: string; turnstileToken?: string };
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    body = parsed;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url } = body;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Please enter a URL to grade" }, { status: 400 });
  }

  // Bot gate before any DNS/DB work: a scripted flood without a valid token never
  // reaches url-guard's resolution or the queue. No-op unless TURNSTILE_SECRET_KEY is set.
  const ip = getClientIP(request);
  const turnstile = await verifyTurnstile(body.turnstileToken, ip);
  if (!turnstile.ok) {
    return NextResponse.json(
      { error: "Verification failed. Please refresh the page and try again." },
      { status: 403 },
    );
  }

  // Validate before consuming a rate-limit slot so typos / blocked URLs don't
  // burn the free-grade quota. Persist the normalized href (same as audit).
  let parsedUrl: URL;
  try {
    parsedUrl = await assertUrlAllowed(url);
  } catch (error) {
    if (error instanceof BlockedUrlError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
  const entryUrl = parsedUrl.href;

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Grading is not configured." }, { status: 503 });
  }

  // Capacity, caller allowance and job/token creation share one transaction.
  const { data, error: enqueueError } = await admin.rpc("enqueue_grade_scan", {
    p_url: entryUrl,
    p_queue_cap: MAX_QUEUED_GRADES,
    p_rate_key: `grade:${ip}`,
    p_rate_max: RATE_LIMITS.grade.max,
    p_rate_window_seconds: RATE_LIMITS.grade.windowSeconds,
  });
  if (enqueueError) {
    Sentry.captureException(enqueueError, { tags: { route: "grade", stage: "enqueue" } });
    return NextResponse.json({ error: "Could not queue the grade." }, { status: 500 });
  }
  const scan = data?.[0];
  if (scan?.status === "busy") {
    return NextResponse.json(
      { error: "The grader is busy. Please try again shortly." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  if (scan?.status === "rate_limited") {
    return NextResponse.json(
      { error: "Free grade limit reached. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(RATE_LIMITS.grade.windowSeconds) } },
    );
  }
  if (scan?.status !== "queued" || !scan.job_id || !scan.token) {
    return NextResponse.json({ error: "Could not queue the grade." }, { status: 500 });
  }

  await logAuditEvent(admin, {
    action: "grade.job_queued",
    resourceType: "audit_job",
    resourceId: scan.job_id,
    metadata: { kind: "grade", token: scan.token },
  });

  return NextResponse.json({ token: scan.token }, { status: 202 });
}
