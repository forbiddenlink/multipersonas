import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { frustrationSeries } from "@/lib/frustration";
import { isBuiltinPersonaId, personaLibrary } from "@engine/personas/library";
import { deriveTraits } from "@engine/personas/traits";

type SB = SupabaseClient<Database>;

// How long a screenshot's signed URL stays valid. Short by design — these are private,
// re-signed on every page load, never embedded permanently (privacy, migration 014).
const SIGNED_URL_TTL_SECONDS = 60 * 30;

export interface ReplayStep {
  step: number;
  action: string;
  detail: string | null;
  /** The persona's inner monologue for this step. Navigation narration, never a verdict. */
  reasoning: string | null;
  pageUrl: string | null;
  /** Short-lived signed URL for the frame, or null when none was captured / signing failed. */
  screenshotUrl: string | null;
  ts: string;
  /** Deterministic 0-100 frustration signal at this step (see lib/frustration). */
  frustration: number;
}

export interface PersonaJourney {
  personaId: string;
  goalCompleted: boolean;
  steps: ReplayStep[];
}

/**
 * Load the replayable journey for a run: every persona's ordered walk, each step carrying
 * its screenshot (as a fresh signed URL), the persona's reasoning, and a derived frustration
 * score. RLS scopes journey_steps to the run's owner, so this returns nothing for a run the
 * caller does not own. Returns [] when the feature's migration isn't applied yet (the query
 * errors soft) or the run predates journey capture.
 */
export async function loadJourney(supabase: SB, runId: string): Promise<PersonaJourney[]> {
  const { data, error } = await supabase
    .from("journey_steps")
    .select("persona_id,step,action,detail,reasoning,goal_completed,page_url,screenshot_path,ts")
    .eq("test_run_id", runId)
    .order("persona_id", { ascending: true })
    .order("step", { ascending: true });

  if (error || !data || data.length === 0) return [];

  // Batch-sign every screenshot path in one call rather than N round-trips.
  const paths = data
    .map((r) => r.screenshot_path)
    .filter((p): p is string => Boolean(p));
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const { data: urls } = await supabase.storage
      .from("journeys")
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    for (const u of urls ?? []) {
      if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
    }
  }

  // Group by persona, preserving the step order the query already sorted.
  const byPersona = new Map<string, typeof data>();
  for (const row of data) {
    const list = byPersona.get(row.persona_id) ?? [];
    list.push(row);
    byPersona.set(row.persona_id, list);
  }

  const journeys: PersonaJourney[] = [];
  for (const [personaId, rows] of byPersona) {
    const goalCompleted = rows[0]?.goal_completed ?? false;
    // Persona-aware frustration: an impatient persona's curve climbs faster.
    // Unknown/ad-hoc personas (not in the library) fall back to neutral (0.5).
    const persona = isBuiltinPersonaId(personaId) ? personaLibrary[personaId] : undefined;
    const patience = persona ? deriveTraits(persona).patience : undefined;
    const scores = frustrationSeries(
      rows.map((r) => ({ pageUrl: r.page_url ?? "", action: r.action })),
      goalCompleted,
      { patience },
    );
    journeys.push({
      personaId,
      goalCompleted,
      steps: rows.map((r, i) => ({
        step: r.step,
        action: r.action,
        detail: r.detail,
        reasoning: r.reasoning,
        pageUrl: r.page_url,
        screenshotUrl: r.screenshot_path ? signed.get(r.screenshot_path) ?? null : null,
        ts: r.ts,
        frustration: scores[i] ?? 0,
      })),
    });
  }

  return journeys;
}
