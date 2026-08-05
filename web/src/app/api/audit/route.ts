import { NextResponse } from "next/server";
import { personaLibrary } from "@engine/personas/library";
import { assertUrlAllowed, BlockedUrlError } from "@engine/security/url-guard";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_PERSONA_IDS, MAX_PERSONAS } from "@/lib/personas";
import { killSwitchEnabled, estimatedCallsFor } from "@/lib/limits";
import { consumeRateLimit } from "@/lib/rate-limit";
import { reserveSpend, releaseSpend } from "@/lib/spend";
import { getClientIP } from "@/lib/client-ip";

// Rate limiting + spend cap are enforced durably in Postgres (lib/rate-limit.ts,
// lib/spend.ts) — shared across instances and not resettable, unlike the in-process
// Map this replaced. See docs/DEPLOYMENT.md and docs/PLAN-2026-07-26-phase2-deploy-infra.md.

export async function POST(request: Request) {
  // Global kill switch — freezes all runs regardless of limits (spend emergency stop).
  if (killSwitchEnabled()) {
    return NextResponse.json(
      { error: "Audits are temporarily unavailable. Please try again later." },
      { status: 503, headers: { "Retry-After": "3600" } },
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let body: { url?: string; personaIds?: unknown; projectId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { url } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json(
      { error: "Please enter a URL to audit" },
      { status: 400 }
    );
  }

  // Validate scheme + destination. This resolves the hostname and judges the
  // resolved addresses, which the previous hostname-regex could not do: it let
  // through localtest.me, metadata.google.internal, and [::ffff:169.254.169.254].
  // The engine re-checks every navigation, so this is the outer gate, not the
  // only one.
  // Runs BEFORE rate-limit consume so a typo / blocked URL does not burn the
  // anonymous 1/hour quota (or an authenticated burst slot).
  let parsedUrl: URL;
  try {
    parsedUrl = await assertUrlAllowed(url);
  } catch (error) {
    if (error instanceof BlockedUrlError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  // Pick the personas to run. The client may request a subset by id; anything not in
  // the engine library is dropped, and the count is capped (each persona is a full agent
  // loop — model cost + wall-clock). Empty/absent -> the core three.
  const requested = Array.isArray(body.personaIds)
    ? body.personaIds.filter((id): id is string => typeof id === "string")
    : [];
  const validIds = [...new Set(requested)].filter((id) => id in personaLibrary);
  const chosenIds = (validIds.length > 0 ? validIds : DEFAULT_PERSONA_IDS).slice(
    0,
    MAX_PERSONAS,
  );

  // Optional project association. Verified against the caller's own RLS-scoped view
  // (not the admin client) so this can never confirm — or deny — the existence of a
  // project owned by someone else. Anonymous callers have no projects, so the field
  // is silently ignored rather than rejected.
  let projectId: string | null = null;
  if (typeof body.projectId === "string" && body.projectId) {
    if (!user) {
      projectId = null;
    } else {
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("id", body.projectId)
        .single();
      if (!project) {
        return NextResponse.json(
          { error: "Project not found." },
          { status: 400 },
        );
      }
      projectId = project.id;
    }
  }

  // Rate limit: authenticated by user ID, anonymous by IP. Durable + shared (Postgres).
  // Only after the request is known-valid — failed validation must not consume a slot.
  const rateLimitKey = user?.id || `anon:${getClientIP(request)}`;
  const rateLimitType = user ? "authenticated" : "anonymous";

  const rateLimit = await consumeRateLimit(rateLimitKey, rateLimitType);
  if (!rateLimit.allowed) {
    const message = user
      ? "You've reached the audit limit (5 per 10 minutes). Please wait and try again."
      : "Free audit limit reached (1 per hour). Sign up for more audits.";
    return NextResponse.json(
      { error: message },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  // Enqueue for the worker. The browser cannot run in this serverless route (no Chromium,
  // exceeds size/time limits — docs/DEPLOYMENT.md); a persistent worker claims the job and
  // runs it. Insert with the service client since audit_jobs has no client insert policy.
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Audits are not configured on this environment (missing service key)." },
      { status: 503 },
    );
  }

  // Reserve this run's estimated model-call budget against the global daily cap,
  // atomically, and ONLY now — after every early-return check (rate limit, URL guard,
  // project ownership, admin-config) has passed. Reserving earlier leaked the
  // reservation against the cap on any of those returns until UTC midnight.
  if (!(await reserveSpend(chosenIds.length, rateLimitKey))) {
    return NextResponse.json(
      { error: "Daily audit capacity reached. Please try again tomorrow." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  const { data: job, error: enqueueError } = await admin
    .from("audit_jobs")
    .insert({
      user_id: user?.id ?? null,
      url: parsedUrl.href,
      persona_ids: chosenIds,
      project_id: projectId,
      // Record what we reserved so the worker/reaper can refund exactly this on failure.
      reserved_calls: estimatedCallsFor(chosenIds.length),
    })
    .select("id")
    .single();

  if (enqueueError || !job) {
    // The reservation went through but no job will run — refund it now rather than
    // letting it sit against the daily cap until UTC midnight.
    await releaseSpend(chosenIds.length);
    return NextResponse.json(
      { error: "Could not queue the audit. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ jobId: job.id, status: "queued" }, { status: 202 });
}
