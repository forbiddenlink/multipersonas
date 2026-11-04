// Pure helpers for the optional single-persona walk on the free grader. No I/O so the
// flag, cap and summary rules stay unit-testable; index.ts owns the database and process work.
//
// Grade semantics are untouched: nothing here feeds the scorer. The walk is stored beside
// the grade result and never changes its letter or score.
import { positiveEnvInt } from "./config.js";

/** Generic goals (understand the offer, find pricing), mobile, ux kind, already a 10-step persona. */
export const GRADE_PERSONA_ID = "impatient-executive";
export const GRADE_PERSONA_MAX_STEPS = 10;
const DEFAULT_DAILY_CAP = 50;
const MAX_QUOTES = 2;
const MAX_QUOTE_CHARS = 240;

/** Only the exact string "1" turns the walk on. Anything else keeps today's axe-only behaviour. */
export function gradePersonaEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.GRADE_PERSONA_ENABLED === "1";
}

export function gradePersonaDailyCap(env: Record<string, string | undefined> = process.env): number {
  return positiveEnvInt(env.GRADE_PERSONA_DAILY_CAP, DEFAULT_DAILY_CAP);
}

export type GradePersonaPlan = "run" | "off" | "capped";

/**
 * Decide whether this grade also gets a persona walk. `consume` takes one slot from the
 * daily counter and returns false at the cap. A counter that throws means "unknown", which
 * is treated as capped: the grade runs axe-only rather than spend model calls unmetered.
 */
export async function gradePersonaPlan(
  env: Record<string, string | undefined>,
  consume: (cap: number) => Promise<boolean>,
): Promise<GradePersonaPlan> {
  if (!gradePersonaEnabled(env)) return "off";
  try {
    return (await consume(gradePersonaDailyCap(env))) ? "run" : "capped";
  } catch {
    return "capped";
  }
}

/** The built-in persona with its step budget capped at 10. Throws if the library lacks it. */
export function selectGradePersona(library: Record<string, unknown>): unknown {
  const base = library[GRADE_PERSONA_ID] as { maxSteps?: unknown } | undefined;
  if (!base || typeof base !== "object") throw new Error(`Built-in persona ${GRADE_PERSONA_ID} not found`);
  const own = typeof base.maxSteps === "number" ? base.maxSteps : GRADE_PERSONA_MAX_STEPS;
  return { ...base, maxSteps: Math.min(own, GRADE_PERSONA_MAX_STEPS) };
}

export interface GradePersonaInput {
  persona: { id: string; name: string; description: string };
  goalCompleted: boolean;
  totalSteps: number;
  steps: { step: number; pageUrl: string; screenshotPath: string; reasoning?: string }[];
}

export type GradePersonaOutcome = "reached" | "stuck" | "inconclusive";

export interface GradePersonaSummary {
  outcome: GradePersonaOutcome;
  totalSteps: number;
  quotes: string[];
  /** The frame to show when the visitor did not finish. Null when it finished or took no step. */
  stuckStep: { screenshotPath: string; pageUrl: string } | null;
}

// A persona gives navigation narration and clarity opinion only. Anything that reads as a
// conformance or accessibility verdict is dropped before it can be shown next to a grade.
const VERDICT_WORDS = /\b(wcag|complian\w*|conform\w*|accessib\w*|ada|section 508|violat\w*|disabilit\w*)\b/i;

function clean(text: string): string {
  const flat = text.replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
  return flat.length > MAX_QUOTE_CHARS ? `${flat.slice(0, MAX_QUOTE_CHARS - 3).trimEnd()}...` : flat;
}

export function summarizeGradePersona(input: GradePersonaInput): GradePersonaSummary {
  const steps = input.steps;
  const outcome: GradePersonaOutcome =
    steps.length === 0 ? "inconclusive" : input.goalCompleted ? "reached" : "stuck";

  const spoken = steps
    .map((s) => (s.reasoning ?? "").trim())
    .filter((r) => r !== "" && !VERDICT_WORDS.test(r))
    .map(clean);
  // First and last lines: how it read the page, and where it ended up.
  const quotes: string[] = spoken.length <= MAX_QUOTES ? spoken : [spoken[0]!, spoken[spoken.length - 1]!];

  const last = steps[steps.length - 1];
  const stuckStep =
    outcome === "stuck" && last && last.screenshotPath
      ? { screenshotPath: last.screenshotPath, pageUrl: last.pageUrl }
      : null;

  return { outcome, totalSteps: input.totalSteps, quotes, stuckStep };
}
