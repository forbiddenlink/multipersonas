import { describe, it, expect } from "vitest";
import { personaLibrary } from "@engine/personas/library";
import { PERSONA_DATA, PERSONA_IDS } from "@/lib/personas";

/**
 * web/src/lib/personas.ts is presentation-only display metadata for the picker;
 * src/personas/library.ts (the engine) is the source of truth for which ids are
 * actually runnable. The file's own header comment says "Keys must stay in sync
 * with personaLibrary ids" but nothing enforced that — a new engine persona (or
 * a removed one) could silently drift out of the web picker, or the picker could
 * offer an id the engine no longer recognizes (which api/audit/route.ts would
 * then silently drop, since it filters `id in personaLibrary`). This is exactly
 * the "engine<->web display-meta sync" gap flagged as the reason new roster
 * personas were deferred (design doc removed in the docs cleanup; see git log for
 * docs/plans/2026-08-01-persona-realism-design.md).
 */
describe("persona display metadata stays in sync with the engine library", () => {
  it("every engine persona id has web display metadata", () => {
    const engineIds = Object.keys(personaLibrary);
    const missing = engineIds.filter((id) => !(id in PERSONA_DATA));
    expect(missing, `engine personas missing from PERSONA_DATA: ${missing.join(", ")}`).toEqual([]);
  });

  it("every web-picker id still resolves to a real engine persona", () => {
    const orphaned = PERSONA_IDS.filter((id) => !(id in personaLibrary));
    expect(orphaned, `PERSONA_DATA ids no longer in the engine: ${orphaned.join(", ")}`).toEqual([]);
  });
});
