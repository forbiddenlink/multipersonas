// Persona browser CONDITIONS — real, imposed browser state, not role-play.
//
// The honesty wall (CONTEXT.md): we do NOT simulate a disabled person's
// experience. We impose a REAL, measurable browser condition (reduced motion,
// forced colors / high-contrast, dark scheme) and measure whether the task can
// still be completed under it. "Could checkout be finished with forced-colors
// on?" is a fact, not a simulation of disability. These map to Playwright's
// native newContext options, so they change what the page actually renders.
// Input modality and network throttling are enforced separately by the agent's
// keyboard and network-conditions helpers.
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
  /**
   * Browser page zoom, as a percentage. Emulated the way browser zoom works: the CSS
   * viewport shrinks by the zoom factor and the device pixel ratio grows by it, so a
   * 1440 px window at 200% lays out at 720 CSS px. The page decides how it reflows.
   */
  pageZoom?: 200 | 400;
}

/** The subset of Playwright's newContext options these conditions control. */
export interface ContextConditionOptions {
  colorScheme?: "light" | "dark" | "no-preference";
  reducedMotion?: "reduce" | "no-preference";
  forcedColors?: "active" | "none";
  viewport?: { width: number; height: number };
  deviceScaleFactor?: number;
}

export function resolveConditions(p: {
  conditions?: BrowserConditions;
  viewport?: { width: number; height: number };
}): ContextConditionOptions {
  const c = p.conditions;
  if (!c) return {};
  const out: ContextConditionOptions = {};
  if (c.pageZoom !== undefined && p.viewport) {
    const factor = c.pageZoom / 100;
    out.viewport = {
      width: Math.round(p.viewport.width / factor),
      height: Math.round(p.viewport.height / factor),
    };
    out.deviceScaleFactor = factor;
  }
  if (c.reducedMotion !== undefined) out.reducedMotion = c.reducedMotion ? "reduce" : "no-preference";
  if (c.forcedColors !== undefined) out.forcedColors = c.forcedColors ? "active" : "none";
  if (c.colorScheme !== undefined) out.colorScheme = c.colorScheme;
  return out;
}
