// View model for the optional "one AI visitor" block on a free grade. Pure: it turns the
// untrusted jsonb the worker wrote (audit_jobs.result.persona) into something safe to render.
// Nothing here reads or changes the grade letter or score.

export type GradePersonaOutcome = "reached" | "stuck" | "inconclusive";

export type GradePersonaView =
  | { kind: "pending" }
  | { kind: "not_run" }
  | {
      kind: "ready";
      outcome: GradePersonaOutcome;
      totalSteps: number;
      personaName: string;
      personaDescription: string;
      quotes: string[];
      /** Object path in the private journeys bucket; the page signs it. Null when none was kept. */
      screenshotPath: string | null;
      pageUrl: string | null;
    };

/** The worker caps the walk at ~2 minutes; past this a "running" row means the worker died mid-walk. */
export const PERSONA_PENDING_WINDOW_MS = 5 * 60 * 1000;

const OUTCOMES: readonly GradePersonaOutcome[] = ["reached", "stuck", "inconclusive"];
const SCREENSHOT_PATH_RE = /^grade\/[0-9a-f-]{36}\/stuck\.png$/i;
const MAX_QUOTES = 2;
const MAX_QUOTE_CHARS = 240;
const MAX_TEXT_CHARS = 200;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/**
 * `raw` is audit_jobs.result.persona. Returns null when no walk was ever planned for this
 * grade (flag off, daily cap hit, older grade), in which case the page shows nothing.
 */
export function parseGradePersona(raw: unknown, nowMs: number = Date.now()): GradePersonaView | null {
  if (!isRecord(raw)) return null;

  if (raw.status === "running") {
    const started = typeof raw.startedAt === "string" ? Date.parse(raw.startedAt) : NaN;
    return Number.isFinite(started) && nowMs - started < PERSONA_PENDING_WINDOW_MS
      ? { kind: "pending" }
      : { kind: "not_run" };
  }
  if (raw.status === "failed") return { kind: "not_run" };
  if (raw.status !== "completed") return null;

  const outcome = OUTCOMES.find((o) => o === raw.outcome);
  if (!outcome) return { kind: "not_run" };

  const quotes = (Array.isArray(raw.quotes) ? raw.quotes : [])
    .map((q) => text(q, MAX_QUOTE_CHARS))
    .filter((q) => q !== "")
    .slice(0, MAX_QUOTES);
  const steps = typeof raw.totalSteps === "number" && Number.isFinite(raw.totalSteps) ? Math.max(0, Math.floor(raw.totalSteps)) : 0;
  const shot = typeof raw.stuckScreenshotPath === "string" && SCREENSHOT_PATH_RE.test(raw.stuckScreenshotPath)
    ? raw.stuckScreenshotPath
    : null;

  return {
    kind: "ready",
    outcome,
    totalSteps: steps,
    personaName: text(raw.personaName, 60),
    personaDescription: text(raw.personaDescription, MAX_TEXT_CHARS),
    quotes,
    screenshotPath: outcome === "stuck" ? shot : null,
    pageUrl: typeof raw.stuckPageUrl === "string" ? raw.stuckPageUrl.slice(0, 500) : null,
  };
}

/** One plain sentence for the outcome. No verdicts: this is one simulated visitor's navigation. */
export function personaOutcomeLine(outcome: GradePersonaOutcome, totalSteps: number): string {
  const steps = `${totalSteps} step${totalSteps === 1 ? "" : "s"}`;
  switch (outcome) {
    case "reached":
      return `It found what it came for in ${steps}.`;
    case "stuck":
      return `It got stuck after ${steps}.`;
    case "inconclusive":
      return "The visit ended before we could tell how it went.";
  }
}
