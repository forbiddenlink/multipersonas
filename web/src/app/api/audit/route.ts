import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { isBuiltinPersonaId } from "@engine/personas/library";
import { assertUrlAllowed, BlockedUrlError } from "@engine/security/url-guard";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionPlan, planAllowsPersonas } from "@/lib/entitlements";
import { DEFAULT_PERSONA_IDS, MAX_PERSONAS } from "@/lib/personas";
import { killSwitchEnabled, estimatedCallsFor } from "@/lib/limits";
import { consumeRateLimit } from "@/lib/rate-limit";
import { reserveSpend, releaseSpend } from "@/lib/spend";
import { getClientIP } from "@/lib/client-ip";
import { enqueueAuditJob } from "@/lib/audit-jobs";
import { logAuditEvent } from "@/lib/audit-log";

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
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    body = parsed;
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

  // Persona task-success is the paid layer. Free/anonymous callers are refused here, before
  // any rate-limit slot or spend reservation, and pointed at the free axe grade. Fail closed:
  // getSessionPlan resolves an unknown plan or a read error to "free".
  const plan = await getSessionPlan(supabase, user?.id ?? null);
  if (!planAllowsPersonas(plan)) {
    return NextResponse.json(
      {
        error: "Task-success personas are a Pro feature. Run a free accessibility grade instead.",
        upgrade: true,
        freeAlternative: "/grade",
      },
      { status: 402 },
    );
  }

  // Pick the personas to run. The client may request a subset by id; anything not in
  // the engine library is dropped, and the count is capped (each persona is a full agent
  // loop — model cost + wall-clock). Empty/absent -> the core three.
  const requested = Array.isArray(body.personaIds)
    ? body.personaIds.filter((id): id is string => typeof id === "string")
    : [];
  const validIds = [...new Set(requested)].filter((id) => isBuiltinPersonaId(id));
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

  // Rate limit only after the request is known-valid AND the environment can
  // actually enqueue — a missing service key must not burn the anon 1/hour slot.
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Audits are not configured on this environment (missing service key)." },
      { status: 503 },
    );
  }

  const rateLimitKey = user?.id || `anon:${getClientIP(request)}`;
  const rateLimitType = user ? "authenticated" : "anonymous";

  const rateLimit = await consumeRateLimit(rateLimitKey, rateLimitType);
  if (rateLimit.unavailable) {
    return NextResponse.json(
      { error: "This service is temporarily unavailable. Please try again shortly." },
      { status: 503, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }
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

  const { id: jobId, error: enqueueError } = await enqueueAuditJob(admin, {
    userId: user?.id ?? null,
    url: parsedUrl.href,
    personaIds: chosenIds,
    projectId,
    reservedCalls: estimatedCallsFor(chosenIds.length),
    callerKey: rateLimitKey,
  });

  if (enqueueError || !jobId) {
    // This failure (bad service key, RLS regression, schema drift) is caught and
    // turned into a clean 500, so it never bubbles to Next's onRequestError hook —
    // report it explicitly or the enqueue path goes dark in prod.
    console.error("[audit] enqueue insert failed:", enqueueError?.message);
    Sentry.captureException(enqueueError ?? new Error("audit_jobs insert returned no row"), {
      tags: { route: "audit", stage: "enqueue" },
    });
    // The reservation went through but no job will run — refund global + caller
    // sub-cap now rather than letting either sit until UTC midnight.
    await releaseSpend(chosenIds.length, rateLimitKey);
    return NextResponse.json(
      { error: "Could not queue the audit. Please try again." },
      { status: 500 },
    );
  }

  await logAuditEvent(admin, {
    actorUserId: user?.id ?? null,
    action: "audit.job_queued",
    resourceType: "audit_job",
    resourceId: jobId,
    metadata: { kind: "audit", projectId, personaCount: chosenIds.length },
  });

  return NextResponse.json({ jobId, status: "queued" }, { status: 202 });
}
