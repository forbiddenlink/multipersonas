/**
 * Pure derivations for the persona-first audit report: which step to show for each persona,
 * which of their own words to quote, and which pages stopped the most personas.
 *
 * No I/O and no `server-only` import, so it is unit-testable. Structural types mirror
 * `ReplayStep` / `PersonaJourney` in lib/journey.ts.
 *
 * Product rules this module must keep: the output is usability opinion from AI personas,
 * never an accessibility verdict, and never copy that implies a disabled user.
 */

export interface OutcomeStep {
  step: number;
  action: string;
  detail: string | null;
  reasoning: string | null;
  pageUrl: string | null;
  screenshotUrl: string | null;
  frustration: number;
}

export interface OutcomeJourney {
  personaId: string;
  goalCompleted: boolean;
  steps: OutcomeStep[];
}

/** A non-finish step at or above this frustration score counts as a stuck point. */
export const STUCK_FRUSTRATION = 60;
const QUOTE_MAX_CHARS = 220;
const GIVE_UP_PREFIX = "Gave up:";

export type OutcomeBadge = "reached" | "blocked" | "not verified" | "text observed";

export function isGiveUp(step: OutcomeStep): boolean {
  return step.action === "finish" && (step.reasoning ?? "").startsWith(GIVE_UP_PREFIX);
}

/**
 * The frame to show for a persona. Reached: the final step. Gave up: the give-up step.
 * Otherwise blocked: the last non-finish step before the finish. A step with a screenshot
 * is preferred, walking back from the preferred step; if none has one, the preferred step
 * is returned anyway so the card can still show its page and words.
 */
/** The step plus its position in `journey.steps`, which is what the replay deep link takes. */
export type EvidenceStep = OutcomeStep & { index: number };

export function pickEvidenceStep(journey: OutcomeJourney): EvidenceStep | null {
  const { steps } = journey;
  if (steps.length === 0) return null;
  const last = steps[steps.length - 1]!;

  let preferredIndex = steps.length - 1;
  if (!journey.goalCompleted && last.action === "finish" && !isGiveUp(last)) {
    const before = steps.length - 2;
    if (before >= 0) preferredIndex = before;
  }

  for (let i = preferredIndex; i >= 0; i--) {
    if (steps[i]!.screenshotUrl) return { ...steps[i]!, index: i };
  }
  return { ...steps[preferredIndex]!, index: preferredIndex };
}

/**
 * Indexes of the steps flagged as stuck points on a persona's track. Same rule as
 * rankStuckPoints: a non-finish step at or above STUCK_FRUSTRATION, plus the evidence
 * step when the persona did not reach the goal.
 */
export function stuckStepIndexes(journey: OutcomeJourney): Set<number> {
  const out = new Set<number>();
  journey.steps.forEach((s, i) => {
    if (s.action !== "finish" && s.frustration >= STUCK_FRUSTRATION) out.add(i);
  });
  if (!journey.goalCompleted) {
    const ev = pickEvidenceStep(journey);
    if (ev) out.add(ev.index);
  }
  return out;
}

function cleanQuote(text: string | null | undefined): string {
  const flat = (text ?? "")
    .replace(/\s*[\u2014\u2013]\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
  if (flat.length <= QUOTE_MAX_CHARS) return flat;
  const cut = flat.slice(0, QUOTE_MAX_CHARS - 3);
  const space = cut.lastIndexOf(" ");
  return `${(space > 40 ? cut.slice(0, space) : cut).trimEnd()}...`;
}

/**
 * Up to `max` short quotes from the persona's own step reasoning. The finish step's
 * reasoning is their summary and leads; the rest are the most frustrated steps first.
 */
export function pickQuotes(journey: OutcomeJourney, max = 3): string[] {
  const finish = [...journey.steps].reverse().find((s) => s.action === "finish");
  const rest = journey.steps
    .filter((s) => s !== finish)
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s.frustration - a.s.frustration || a.i - b.i)
    .map(({ s }) => s);

  const out: string[] = [];
  for (const s of finish ? [finish, ...rest] : rest) {
    const q = cleanQuote(s.reasoning);
    if (q && !out.includes(q)) out.push(q);
    if (out.length >= max) break;
  }
  return out;
}

export interface StuckPoint {
  pageUrl: string;
  personaIds: string[];
  blockedPersonaIds: string[];
  peakFrustration: number;
}

/**
 * Group stuck moments by page. A moment is a non-finish step at or above STUCK_FRUSTRATION,
 * or the evidence step of a persona that did not reach the goal. Each persona counts once
 * per page. Ranked by personas affected, then peak frustration, then page.
 */
export function rankStuckPoints(
  journeys: OutcomeJourney[],
  opts: { limit?: number } = {},
): StuckPoint[] {
  const byUrl = new Map<
    string,
    { personas: Set<string>; blocked: Set<string>; peak: number }
  >();
  const touch = (url: string, personaId: string, frustration: number, blocked: boolean) => {
    const entry = byUrl.get(url) ?? { personas: new Set(), blocked: new Set(), peak: 0 };
    entry.personas.add(personaId);
    if (blocked) entry.blocked.add(personaId);
    entry.peak = Math.max(entry.peak, frustration);
    byUrl.set(url, entry);
  };

  for (const j of journeys) {
    for (const s of j.steps) {
      if (s.action !== "finish" && s.pageUrl && s.frustration >= STUCK_FRUSTRATION) {
        touch(s.pageUrl, j.personaId, s.frustration, false);
      }
    }
    if (!j.goalCompleted) {
      const ev = pickEvidenceStep(j);
      if (ev?.pageUrl) touch(ev.pageUrl, j.personaId, ev.frustration, true);
    }
  }

  const ranked = [...byUrl.entries()]
    .map(([pageUrl, e]) => ({
      pageUrl,
      personaIds: [...e.personas],
      blockedPersonaIds: [...e.blocked],
      peakFrustration: e.peak,
    }))
    .sort(
      (a, b) =>
        b.personaIds.length - a.personaIds.length ||
        b.peakFrustration - a.peakFrustration ||
        a.pageUrl.localeCompare(b.pageUrl),
    );
  return ranked.slice(0, opts.limit ?? 5);
}

/** Badge wording. A text-check run says "text observed", not "reached". */
export function outcomeBadge(goalCompleted: boolean | null, taskCheck: boolean): OutcomeBadge {
  if (goalCompleted === null) return "not verified";
  if (taskCheck) return goalCompleted ? "text observed" : "not verified";
  return goalCompleted ? "reached" : "blocked";
}

export function outcomeHeadline(reached: number, total: number, taskCheck: boolean): string {
  if (total === 0) return "No persona results recorded";
  if (taskCheck) return `${reached} of ${total} profiles matched the text check`;
  return `${reached} of ${total} ${total === 1 ? "persona" : "personas"} reached the goal`;
}

/** Viewport, input and connection, e.g. "375 x 812 · touch · slow-3g". */
export function describeDevice(p: {
  viewport: { width: number; height: number };
  inputModality: string;
  isMobile: boolean;
  connectionSpeed: string;
}): string {
  const input = p.inputModality === "keyboard" ? "keyboard" : p.isMobile ? "touch" : "pointer";
  const net = p.connectionSpeed === "fast" ? null : p.connectionSpeed;
  return [`${p.viewport.width} x ${p.viewport.height}`, input, net].filter(Boolean).join(" · ");
}

export interface PersonaCardMeta {
  name: string;
  role: string;
  device: string;
}

export interface PersonaOutcomeCard extends PersonaCardMeta {
  personaId: string;
  goalCompleted: boolean | null;
  badge: OutcomeBadge;
  evidence: EvidenceStep | null;
  quotes: string[];
  steps: number;
  peakFrustration: number;
}

export interface PersonaOutcomes {
  headline: string;
  reached: number;
  total: number;
  hasJourneys: boolean;
  cards: PersonaOutcomeCard[];
  stuckPoints: StuckPoint[];
}

export function buildPersonaOutcomes(input: {
  personaIds: string[];
  journeys: OutcomeJourney[];
  meta: (personaId: string) => PersonaCardMeta;
  taskCheck: boolean;
  /** test_runs.task_success_* — the headline when no journey was captured. */
  runTotals?: { achieved: number; total: number };
  /** Persona-authored finding titles, used as the only words when there is no journey. */
  notesByPersona?: Record<string, string[]>;
}): PersonaOutcomes {
  const { journeys, taskCheck } = input;
  const byId = new Map(journeys.map((j) => [j.personaId, j]));
  const ids = [...input.personaIds];
  for (const j of journeys) if (!ids.includes(j.personaId)) ids.push(j.personaId);

  const cards: PersonaOutcomeCard[] = ids.map((personaId) => {
    const j = byId.get(personaId);
    const goalCompleted = j ? j.goalCompleted : null;
    const journeyQuotes = j ? pickQuotes(j) : [];
    const quotes =
      journeyQuotes.length > 0
        ? journeyQuotes
        : (input.notesByPersona?.[personaId] ?? [])
            .map(cleanQuote)
            .filter(Boolean)
            .slice(0, 3);
    return {
      personaId,
      ...input.meta(personaId),
      goalCompleted,
      badge: outcomeBadge(goalCompleted, taskCheck),
      evidence: j ? pickEvidenceStep(j) : null,
      quotes,
      steps: j?.steps.length ?? 0,
      peakFrustration: Math.max(0, ...(j?.steps.map((s) => s.frustration) ?? [])),
    };
  });

  const hasJourneys = journeys.length > 0;
  const total = hasJourneys ? cards.length : (input.runTotals?.total ?? cards.length);
  const reached = hasJourneys
    ? cards.filter((c) => c.goalCompleted === true).length
    : (input.runTotals?.achieved ?? 0);

  return {
    headline: outcomeHeadline(reached, total, taskCheck),
    reached,
    total,
    hasJourneys,
    cards,
    stuckPoints: rankStuckPoints(journeys),
  };
}
