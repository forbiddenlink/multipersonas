import { describe, it, expect } from "vitest";
import { personaLibrary, isBuiltinPersonaId } from "./library.js";
import { generateSystemPrompt } from "./types.js";
import type { Persona } from "./types.js";

/**
 * The persona library IS the product — a run's output is only as good as the
 * persona definition that produced it. framing.test.ts guards the honesty-wall
 * invariants (no disability simulation, no verdict); this guards structural
 * integrity, so a malformed or half-edited persona can't ship and silently
 * degrade every audit that uses it. If one of these fails, fix the persona in
 * library.ts, not the test. (12-factor agents #2: own your prompts, version them.)
 */

const entries = Object.entries(personaLibrary);

describe("persona library integrity", () => {
  it("is non-empty", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it("keys the library by each persona's own id", () => {
    for (const [key, persona] of entries) {
      expect(persona.id).toBe(key);
    }
  });

  it("has no duplicate ids", () => {
    const ids = entries.map(([, p]) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does not treat Object.prototype keys as runnable personas", () => {
    expect(isBuiltinPersonaId("constructor")).toBe(false);
    expect(isBuiltinPersonaId("toString")).toBe(false);
    expect(isBuiltinPersonaId("__proto__")).toBe(false);
    expect(isBuiltinPersonaId("first-time-visitor")).toBe(true);
  });

  describe.each(entries)("persona %s", (_id, persona: Persona) => {
    it("has non-empty identity fields", () => {
      expect(persona.id.trim()).not.toBe("");
      expect(persona.name.trim()).not.toBe("");
      expect(persona.description.trim()).not.toBe("");
    });

    it("declares a valid profile kind", () => {
      expect(["ux", "traversal"]).toContain(persona.kind);
    });

    it("has sane numeric + enum constraints the engine relies on", () => {
      expect(persona.techProficiency).toBeGreaterThanOrEqual(1);
      expect(persona.techProficiency).toBeLessThanOrEqual(5);
      expect(persona.maxSteps).toBeGreaterThan(0);
      expect(persona.viewport.width).toBeGreaterThan(0);
      expect(persona.viewport.height).toBeGreaterThan(0);
      expect(["low", "medium", "high"]).toContain(persona.patienceLevel);
      expect(["fast", "3g", "slow-3g"]).toContain(persona.connectionSpeed);
    });

    it("gives a UX persona at least one goal to pursue", () => {
      // A ux persona with no goal can never report task success/failure — the
      // whole point of the layer. traversal harnesses run a fixed procedure.
      if (persona.kind === "ux") {
        expect(persona.goals.length).toBeGreaterThan(0);
      }
    });

    it("generates a substantial, deterministic system prompt", () => {
      const { systemPrompt: _drop, ...def } = persona;
      const a = generateSystemPrompt(def);
      const b = generateSystemPrompt(def);
      expect(a).toBe(b); // pure function of the definition — no hidden state
      expect(a.length).toBeGreaterThan(200);
    });
  });

  it("matches the committed roster (catches accidental add/remove)", () => {
    const roster = entries
      .map(([, p]) => `${p.id} · ${p.kind}`)
      .sort();
    expect(roster).toMatchSnapshot();
  });
});
