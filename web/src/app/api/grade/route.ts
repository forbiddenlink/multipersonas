import { NextResponse } from "next/server";
import { assertUrlAllowed, BlockedUrlError } from "@engine/security/url-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { killSwitchEnabled, positiveEnvInt } from "@/lib/limits";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIP } from "@/lib/client-ip";

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

  // Backpressure before rate-limit: a full queue or missing config must not burn
  // the free-grade quota (same honesty class as validate-before-limit).
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

  const ip = getClientIP(request);
  const rate = await consumeRateLimit(`grade:${ip}`, "grade");
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Free grade limit reached. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  // persona_ids / reserved_calls / status all have DB defaults; user_id is null (anon).
  const { data: job, error: jobErr } = await admin
    .from("audit_jobs")
    .insert({ url: entryUrl, kind: "grade", user_id: null })
    .select("id")
    .single();
  if (jobErr || !job) {
    return NextResponse.json({ error: "Could not queue the grade." }, { status: 500 });
  }

  const { data: scan, error: scanErr } = await admin
    .from("grader_scans")
    .insert({ job_id: job.id, entry_url: entryUrl })
    .select("token")
    .single();
  if (scanErr || !scan) {
    // Don't leave an orphaned grade job on the queue — the worker would run a
    // scan with no public token for the user.
    await admin.from("audit_jobs").delete().eq("id", job.id);
    return NextResponse.json({ error: "Could not queue the grade." }, { status: 500 });
  }

  return NextResponse.json({ token: scan.token }, { status: 202 });
}
