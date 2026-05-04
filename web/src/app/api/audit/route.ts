import { NextResponse } from "next/server";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { prebuiltPersonas } from "@engine/personas/prebuilt";
import { runMultiPersonaTest } from "@engine/agent/orchestrator";
import { createClient } from "@/lib/supabase/server";

// Rate limiting: authenticated users get 3/10min, anonymous get 1/hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const LIMITS = {
  authenticated: { max: 3, windowMs: 10 * 60 * 1000 },
  anonymous: { max: 1, windowMs: 60 * 60 * 1000 },
} as const;

function checkRateLimit(key: string, type: "authenticated" | "anonymous"): boolean {
  const now = Date.now();
  const { max, windowMs } = LIMITS[type];
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

  let body: { url?: string };
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

  // Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    return NextResponse.json(
      { error: "Enter a full URL starting with https://" },
      { status: 400 }
    );
  }

  // Block private/reserved IPs (SSRF protection)
  const hostname = parsedUrl.hostname;
  const blockedPatterns = [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^0\./,
    /^\[::1\]$/,
    /^\[fc/i,
    /^\[fd/i,
    /^\[fe80/i,
  ];
  if (blockedPatterns.some((pattern) => pattern.test(hostname))) {
    return NextResponse.json(
      { error: "This URL points to a private network and can't be tested." },
      { status: 400 }
    );
  }

  // Create temp directory for output
  const tmpDir = path.join(
    os.tmpdir(),
    `multipersonas-audit-${Date.now()}`
  );

  try {
    // Select the 3 built-in personas
    const personaIds = [
      "first-time-visitor",
      "screen-reader-user",
      "mobile-slow-connection",
    ] as const;

    const personas = personaIds.map((id) => {
      const persona = prebuiltPersonas[id];
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
      overallScore: result.overallScore,
      personas: result.personas.map((pr) => ({
        id: pr.persona.id,
        name: pr.persona.name,
        description: pr.persona.description,
        score: pr.score,
        goalCompleted: pr.agentResult.goalCompleted,
        totalSteps: pr.agentResult.totalSteps,
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

    return NextResponse.json(response);
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
