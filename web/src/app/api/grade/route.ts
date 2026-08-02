import { NextResponse } from "next/server";
import { assertUrlAllowed, BlockedUrlError } from "@engine/security/url-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { killSwitchEnabled } from "@/lib/limits";
import { consumeRateLimit } from "@/lib/rate-limit";

// Public accessibility grader: anonymous, axe-only, no model spend. Enqueues a
// kind='grade' job onto the shared audit_jobs queue; the worker runs gradeScan and
// writes the public grader_scans row this returns a token for.

const MAX_QUEUED_GRADES = Number(process.env.GRADE_QUEUE_CAP ?? 25);

function getClientIP(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: Request) {
  if (killSwitchEnabled()) {
    return NextResponse.json(
      { error: "Grading is temporarily unavailable." },
      { status: 503, headers: { "Retry-After": "3600" } },
    );
  }

  const ip = getClientIP(request);
  const rate = await consumeRateLimit(`grade:${ip}`, "grade");
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Free grade limit reached. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url } = body;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Please enter a URL to grade" }, { status: 400 });
  }

  try {
    await assertUrlAllowed(url);
  } catch (error) {
    if (error instanceof BlockedUrlError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Grading is not configured." }, { status: 503 });
  }

  // Backpressure: a grade flood shares one worker with real audits — cap the
  // queued grades so it can't starve them.
  const { count } = await admin
    .from("audit_jobs")
    .select("id", { count: "exact", head: true })
    .eq("kind", "grade")
    .eq("status", "queued");
  if ((count ?? 0) >= MAX_QUEUED_GRADES) {
    return NextResponse.json(
      { error: "The grader is busy. Please try again shortly." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  // persona_ids / reserved_calls / status all have DB defaults; user_id is null (anon).
  const { data: job, error: jobErr } = await admin
    .from("audit_jobs")
    .insert({ url, kind: "grade", user_id: null })
    .select("id")
    .single();
  if (jobErr || !job) {
    return NextResponse.json({ error: "Could not queue the grade." }, { status: 500 });
  }

  const { data: scan, error: scanErr } = await admin
    .from("grader_scans")
    .insert({ job_id: job.id, entry_url: url })
    .select("token")
    .single();
  if (scanErr || !scan) {
    return NextResponse.json({ error: "Could not queue the grade." }, { status: 500 });
  }

  return NextResponse.json({ token: scan.token }, { status: 202 });
}
