// Deterministic frustration signal for Persona Replay Theater.
//
// A 0-100 score per step derived ONLY from observable navigation behavior — never a model
// call. That keeps it free, reproducible, and honest: it is an inferred UX signal, not a
// compliance verdict (the axe/persona wall). Higher = the walk looks more like a stuck,
// backtracking, effortful user; lower = smooth progress.
//
// Inputs are the two things every recorded step carries: which page it was on and what
// action the persona took. Signals:
//   - Effort creep: mounting cost the longer a goal takes.
//   - Revisits: returning to a page already seen = looping / lost.
//   - Stall: the same action on the same page twice in a row = retrying, not advancing.
//   - Terminal relief/rage: the last step drops if the goal was reached, spikes if not.

export interface FrustrationInput {
  pageUrl: string;
  action: string;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function frustrationSeries(
  steps: FrustrationInput[],
  goalCompleted: boolean,
): number[] {
  const seen = new Map<string, number>();
  const out: number[] = [];

  for (let i = 0; i < steps.length; i++) {
    const { pageUrl, action } = steps[i];

    // Effort creep: ramps to ~35 over the first several steps, then plateaus.
    const effort = Math.min(i, 8) / 8 * 35;

    // Revisits: how many earlier steps were already on this page (looping / backtracking).
    const priorVisits = seen.get(pageUrl) ?? 0;
    const revisit = Math.min(priorVisits * 18, 45);

    // Stall: identical action + page as the immediately preceding step (retrying in place).
    const prev = steps[i - 1];
    const stall = i > 0 && prev.pageUrl === pageUrl && prev.action === action ? 22 : 0;

    let score = effort + revisit + stall;

    // The ending colors the whole story: relief on success, rage on a dead end.
    if (i === steps.length - 1) {
      score += goalCompleted ? -45 : 30;
    }

    out.push(clamp(score));
    seen.set(pageUrl, priorVisits + 1);
  }

  return out;
}

export type FrustrationBand = "calm" | "friction" | "struggling" | "blocked";

/** Bucket a score into a labeled band. Colors reuse the verified-AA severity ramp as a
 * heat scale — this is a persona-side signal, so it is never rendered as a SeverityChip. */
export function frustrationBand(score: number): {
  band: FrustrationBand;
  label: string;
  token: string;
} {
  if (score < 25) return { band: "calm", label: "calm", token: "var(--muted-foreground)" };
  if (score < 50) return { band: "friction", label: "friction", token: "var(--severity-moderate)" };
  if (score < 75) return { band: "struggling", label: "struggling", token: "var(--severity-serious)" };
  return { band: "blocked", label: "blocked", token: "var(--severity-critical)" };
}
