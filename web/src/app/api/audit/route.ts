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

// Rate limiting: authenticated users get 3/10min, anonymous get 1/hour.
//
// ⚠️ NOT A REAL LIMIT YET. This Map is per-process: every serverless instance
// keeps its own copy and loses it on recycle, so the ceiling is really
// (limit x instances) and resets constantly. It also trusts X-Forwarded-For,
// which a client can set freely.
//
// That is tolerable only while this route is unreachable in production (it
// launches Chromium, which cannot run on Vercel — see docs/DEPLOYMENT.md).
// Durable, shared rate limiting is a hard prerequisite for the public deploy
// and is tracked as a Phase 1 blocker alongside the worker split, because the
// enforcement point moves to the queue.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/** Cap on distinct keys held, so a spray of forged IPs can't grow the Map without bound. */
const MAX_TRACKED_KEYS = 10_000;

const LIMITS = {
  authenticated: { max: 3, windowMs: 10 * 60 * 1000 },
  anonymous: { max: 1, windowMs: 60 * 60 * 1000 },
} as const;

/** Drop expired entries; if still over the cap, evict oldest-expiring first. */
function evict(now: number): void {
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
  if (rateLimitMap.size <= MAX_TRACKED_KEYS) return;
  const byExpiry = [...rateLimitMap.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
  for (const [key] of byExpiry.slice(0, rateLimitMap.size - MAX_TRACKED_KEYS)) {
    rateLimitMap.delete(key);
  }
}

function checkRateLimit(key: string, type: "authenticated" | "anonymous"): boolean {
  const now = Date.now();
  const { max, windowMs } = LIMITS[type];
  evict(now);
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) {
    return false;
  }

  entry.count++;
  return true;
}

function getClientIP(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Rate limit: authenticated by user ID, anonymous by IP
  const rateLimitKey = user?.id || `anon:${getClientIP(request)}`;
  const rateLimitType = user ? "authenticated" : "anonymous";

  if (!checkRateLimit(rateLimitKey, rateLimitType)) {
    const entry = rateLimitMap.get(rateLimitKey);
    const retryAfter = entry ? Math.ceil((entry.resetAt - Date.now()) / 1000) : 600;
    const message = user
      ? "You've reached the audit limit (3 per 10 minutes). Please wait and try again."
      : "Free audit limit reached (1 per hour). Sign up for more audits.";
    return NextResponse.json(
      { error: message },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
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
