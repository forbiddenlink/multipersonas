// Persona trait vector + the pure decision helpers that turn traits into
// CODE-ENFORCED behavior boundaries.
//
// Why this exists: research (PersonaGym, arxiv 2407.18416) shows prompt-only
// persona steering is unreliable and unreproducible — even frontier models fail
// persona-consistency at scale. So a trait must not merely appear in the system
// prompt; it must change what the engine's control flow allows. The LLM still
// picks the action; these helpers decide the boundary the trait implies (give-up
// threshold, dead-end tolerance). Kept pure + deterministic so task-success stays
// reproducible and the boundaries are unit-testable in isolation (mirrors
// src/grader/score.ts).

export interface TraitVector {
  /** Willingness to keep trying a failing path. Low = bails fast. */
  patience: number; // 0..1
  /** Comfort with jargon / unlabeled controls / technical flows. */
  techLiteracy: number; // 0..1
  /** Drive to reach the goal across setbacks (distinct from patience per-step). */
  persistence: number; // 0..1
  /** Caution before irreversible actions (submit / pay / delete). */
  riskAversion: number; // 0..1
  /** Care in reading labels / noticing small targets. */
  attentionToDetail: number; // 0..1
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const PATIENCE_BY_LEVEL: Record<"low" | "medium" | "high", number> = {
  low: 0.2,
  medium: 0.5,
  high: 0.85,
};

/**
 * Derive a trait vector from a persona. Back-compat is the point: the 9 existing
 * personas carry only `patienceLevel` (low/medium/high) and `techProficiency`
 * (1-5) and NO trait vector, so they must map to something sensible and nothing
 * may break. An explicit `traits` (partial) always overrides the derived values.
 */
export function deriveTraits(p: {
  patienceLevel: "low" | "medium" | "high";
  techProficiency: 1 | 2 | 3 | 4 | 5;
  traits?: Partial<TraitVector>;
}): TraitVector {
  const patience = PATIENCE_BY_LEVEL[p.patienceLevel];
  const techLiteracy = (p.techProficiency - 1) / 4; // 1->0, 5->1
  const base: TraitVector = {
    patience,
    techLiteracy,
    persistence: patience, // correlated for back-compat; personas can decouple via traits
    riskAversion: 0.5, // no source field on legacy personas -> neutral
    attentionToDetail: 0.5,
  };
  if (!p.traits) return base;
  return {
    patience: clamp01(p.traits.patience ?? base.patience),
    techLiteracy: clamp01(p.traits.techLiteracy ?? base.techLiteracy),
    persistence: clamp01(p.traits.persistence ?? base.persistence),
    riskAversion: clamp01(p.traits.riskAversion ?? base.riskAversion),
    attentionToDetail: clamp01(p.traits.attentionToDetail ?? base.attentionToDetail),
  };
}

/**
 * The `isStuck` repeat threshold for this persona: how many identical actions in
 * a row read as "stuck". Impatient personas notice sooner (smaller threshold).
 * Bounded 2..4 so it never trips on a single action or waits forever.
 */
export function giveUpThreshold(t: TraitVector): number {
  return Math.round(2 + t.patience * 2); // patience 0 -> 2, 1 -> 4
}

/**
 * How many consecutive stuck-detections this persona tolerates before the engine
 * FORCES a blocked termination (the code-enforced give-up that fixes the "banana
 * problem" — LLM user-sims inherit a cooperative bias and otherwise loop to
 * maxSteps pretending to still be trying). Low persistence -> gives up after one.
 * Bounded 1..3.
 */
export function maxDeadEnds(t: TraitVector): number {
  return Math.round(1 + t.persistence * 2); // persistence 0 -> 1, 1 -> 3
}
