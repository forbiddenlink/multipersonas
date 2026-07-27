import { NextResponse } from "next/server";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { personaLibrary } from "@engine/personas/library";
import { runMultiPersonaTest } from "@engine/agent/orchestrator";
import { assertUrlAllowed, BlockedUrlError } from "@engine/security/url-guard";
import { createClient } from "@/lib/supabase/server";
import { saveAudit } from "@/lib/audits";
import { DEFAULT_PERSONA_IDS, MAX_PERSONAS } from "@/lib/personas";
import { killSwitchEnabled } from "@/lib/limits";
import { consumeRateLimit } from "@/lib/rate-limit";
import { reserveSpend } from "@/lib/spend";

// Rate limiting + spend cap are enforced durably in Postgres (lib/rate-limit.ts,
// lib/spend.ts) — shared across instances and not resettable, unlike the in-process
// Map this replaced. See docs/DEPLOYMENT.md and docs/PLAN-2026-07-26-phase2-deploy-infra.md.

function getClientIP(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

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

  // Rate limit: authenticated by user ID, anonymous by IP. Durable + shared (Postgres).
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

  let body: { url?: string; personaIds?: unknown };
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
  let parsedUrl: URL;
  try {
    parsedUrl = await assertUrlAllowed(url);
  } catch (error) {
    if (error instanceof BlockedUrlError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  // Create temp directory for output
  const tmpDir = path.join(
    os.tmpdir(),
    `multipersonas-audit-${Date.now()}`
  );

  try {
    // Pick the personas to run. The client may request a subset by id; anything not
    // in the engine library is dropped, and the count is capped (each persona is a
    // full agent loop — model cost + wall-clock). Empty/absent -> the core three.
    const requested = Array.isArray(body.personaIds)
      ? body.personaIds.filter((id): id is string => typeof id === "string")
      : [];
    const validIds = [...new Set(requested)].filter((id) => id in personaLibrary);
    const chosenIds = (validIds.length > 0 ? validIds : DEFAULT_PERSONA_IDS).slice(
      0,
      MAX_PERSONAS,
    );

    const personas = chosenIds.map((id) => {
      const persona = personaLibrary[id];
      if (!persona) throw new Error(`Persona ${id} not found`);
      return persona;
    });

    // Reserve this run's estimated model-call budget against the global daily cap,
    // atomically, before spending anything. If we can't reserve, refuse the run.
    if (!(await reserveSpend(personas.length))) {
      return NextResponse.json(
        { error: "Daily audit capacity reached. Please try again tomorrow." },
        { status: 429, headers: { "Retry-After": "3600" } },
      );
    }

    // Run with a 2-minute timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    const resultPromise = runMultiPersonaTest({
      url: parsedUrl.href,
      personas,
      outputDir: tmpDir,
      parallel: true,
      runAxe: true,
    });

    const abortPromise = new Promise<never>((_, reject) => {
      controller.signal.addEventListener("abort", () => {
        reject(new Error("The site took too long to respond. Try a simpler page or check the URL is accessible."));
      });
    });

    const result = await Promise.race([resultPromise, abortPromise]);
    clearTimeout(timeout);

    // Transform to simplified response (no file paths)
    const response = {
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
        })),
      })),
      axeFindings: result.axeFindings.map((f) => ({
        severity: f.severity,
        title: f.title,
        description: f.description,
        recommendation: f.recommendation,
      })),
      conflicts: result.conflicts.map((c) => ({
        description: c.description,
        suggestion: c.suggestion,
      })),
    };

    // Persist for signed-in users so it shows in their history. Best-effort:
    // a failed save must not fail the audit — the result is already in hand.
    let savedId: string | null = null;
    if (user) {
      try {
        savedId = await saveAudit(supabase, user.id, response);
      } catch {
        savedId = null;
      }
    }

    return NextResponse.json({ ...response, id: savedId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    // Clean up temp directory
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}
