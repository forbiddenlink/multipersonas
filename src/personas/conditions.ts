// Persona browser CONDITIONS — real, imposed browser state, not role-play.
//
// The honesty wall (CONTEXT.md): we do NOT simulate a disabled person's
// experience. We impose a REAL, measurable browser condition (reduced motion,
// forced colors / high-contrast, dark scheme) and measure whether the task can
// still be completed under it. "Could checkout be finished with forced-colors
// on?" is a fact, not a simulation of disability. These map to Playwright's
// native newContext options, so they change what the page actually renders —
// unlike the legacy `inputModality`/`connectionSpeed` fields, which today only
// appear in the prompt and are never enforced.
//
// Pure + back-compat: a persona with no `conditions` yields {} (no overrides),
// so every existing persona renders exactly as before.

export interface BrowserConditions {
  /** Emulate prefers-reduced-motion: reduce. */
  reducedMotion?: boolean;
  /** Emulate forced-colors: active (Windows High Contrast style). */
  forcedColors?: boolean;
  /** Pin the color scheme the page sees. */
  colorScheme?: "light" | "dark";
}

/** The subset of Playwright's newContext options these conditions control. */
export interface ContextConditionOptions {
  colorScheme?: "light" | "dark" | "no-preference";
  reducedMotion?: "reduce" | "no-preference";
  forcedColors?: "active" | "none";
}

export function resolveConditions(p: { conditions?: BrowserConditions }): ContextConditionOptions {
  const c = p.conditions;
  if (!c) return {};
  const out: ContextConditionOptions = {};
  if (c.reducedMotion !== undefined) out.reducedMotion = c.reducedMotion ? "reduce" : "no-preference";
  if (c.forcedColors !== undefined) out.forcedColors = c.forcedColors ? "active" : "none";
  if (c.colorScheme !== undefined) out.colorScheme = c.colorScheme;
  return out;
}
