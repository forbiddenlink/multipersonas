import { NextResponse } from "next/server";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { prebuiltPersonas } from "@engine/personas/prebuilt";
import { runMultiPersonaTest } from "@engine/agent/orchestrator";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
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
      { error: "Missing required field: url" },
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
      { error: "Invalid URL. Must be a valid http or https URL." },
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
      { error: "URLs pointing to private/internal networks are not allowed." },
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
        reject(new Error("Audit timed out after 2 minutes"));
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
