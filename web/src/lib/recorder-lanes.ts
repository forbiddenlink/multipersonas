/**
 * Pure builder for the run page's session recorder inputs. No I/O and no `server-only`
 * import, so it is unit-testable. Everything it reads is already loaded by the page.
 */
import { displayFinding } from "@/lib/finding-display";
import { pickEvidenceStep, type PersonaOutcomeCard } from "@/lib/persona-outcomes";
import type { PersonaJourney } from "@/lib/journey";
import type { RecorderAxeItem, RecorderPersona } from "@/components/session-recorder";

/** Pages shown as rows in the axe lane; findings on further pages stay in the issues table. */
export const AXE_LANE_MAX_PAGES = 6;

export interface LaneFindingRow {
  id: string;
  severity: string;
  rule_id: string | null;
  title: string;
  description: string | null;
  recommendation: string | null;
  page_url: string | null;
}

export interface RecorderLanes {
  personas: RecorderPersona[];
  axePages: { pageUrl: string; items: RecorderAxeItem[] }[];
  axeNotShown: number;
  initialPersona: string | undefined;
  initialStep: number;
}

export function buildRecorderLanes(input: {
  cards: PersonaOutcomeCard[];
  journeys: PersonaJourney[];
  /** Persona-authored finding titles per persona id, shown when no journey was recorded. */
  notesByPersona: Map<string, { title: string }[]>;
  /** Axe findings, already in display order (most severe first). */
  axeFindings: LaneFindingRow[];
  personaParam?: string;
  stepParam?: string;
  evidence?: string;
}): RecorderLanes {
  const { cards, journeys, axeFindings } = input;

  const personas: RecorderPersona[] = cards.map((c) => ({
    personaId: c.personaId,
    name: c.name,
    role: c.role,
    device: c.device,
    badge: c.badge,
    journey: journeys.find((j) => j.personaId === c.personaId) ?? null,
    notes: (input.notesByPersona.get(c.personaId) ?? []).map((f) => f.title),
  }));

  const pageMap = new Map<string, RecorderAxeItem[]>();
  let axeNotShown = 0;
  for (const f of axeFindings) {
    if (!f.page_url) {
      axeNotShown += 1;
      continue;
    }
    if (!pageMap.has(f.page_url) && pageMap.size >= AXE_LANE_MAX_PAGES) {
      axeNotShown += 1;
      continue;
    }
    const shown = displayFinding({
      ruleId: f.rule_id,
      title: f.title,
      description: f.description,
      recommendation: f.recommendation,
    });
    const list = pageMap.get(f.page_url) ?? [];
    list.push({
      id: f.id,
      severity: f.severity,
      ruleId: shown.ruleId ?? null,
      title: shown.title,
      why: shown.why ?? null,
      fix: shown.fix ?? null,
      pageUrl: f.page_url,
    });
    pageMap.set(f.page_url, list);
  }
  const axePages = [...pageMap].map(([pageUrl, items]) => ({ pageUrl, items }));

  // Which persona the recorder opens on: the deep link if it names a playable one,
  // otherwise the first persona that has steps.
  const playableIds = new Set(
    journeys.filter((j) => j.steps.length > 0).map((j) => j.personaId),
  );
  const linked = input.personaParam && playableIds.has(input.personaParam) ? input.personaParam : undefined;
  const openId = linked ?? personas.find((p) => playableIds.has(p.personaId))?.personaId;
  const openJourney = openId ? journeys.find((j) => j.personaId === openId) : undefined;

  const verificationIndex = openJourney?.steps.findIndex((s) => s.action === "verify_task") ?? -1;
  const stepNumber =
    input.stepParam !== undefined && input.stepParam.trim() !== "" ? Number(input.stepParam) : NaN;

  let initialStep = 0;
  if (linked && input.evidence === "task" && verificationIndex >= 0) {
    initialStep = verificationIndex;
  } else if (linked && Number.isFinite(stepNumber)) {
    initialStep = stepNumber;
  } else if (openJourney) {
    initialStep = pickEvidenceStep(openJourney)?.index ?? 0;
  }

  return { personas, axePages, axeNotShown, initialPersona: input.personaParam, initialStep };
}
