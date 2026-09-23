import { describe, it, expect } from "vitest";
import { isBuiltinPersonaId, personaLibrary, personasByCategory } from "./library.js";
import { prebuiltPersonas } from "./prebuilt.js";
import { generateSystemPrompt } from "./types.js";

/**
 * These tests encode a product constraint, not a style preference.
 *
 * The product must never ship a model roleplaying a disabled person, and must
 * never let a model render an accessibility verdict. Both were true before
 * 2026-07-15 (a persona named "James, a 42-year-old software engineer who is
 * blind" whose prompt asked it to score WCAG compliance 1-10). LLM a11y
 * judgments run ~71% precision, and simulation is harmful regardless of accuracy.
 *
 * If one of these fails, the fix is the prompt, not the test.
 * See docs/PLAN-2026-07-15-repositioning.md.
 */

const allPersonas = [
  ...Object.values(prebuiltPersonas),
  ...Object.values(personaLibrary),
];

/** Phrases that assert a disability, or claim to experience one. */
const SIMULATION_PATTERNS = [
  /\bwho is blind\b/i,
  /\byou are blind\b/i,
  /\bcannot see the screen\b/i,
  /\bdeuteranopia\b/i,
  /\bcolou?r ?blind/i,
  /\blow vision\b/i,
  /\bmotor impairment\b/i,
  /\bscreen magnifier\b/i,
  /\brelies? entirely on a screen reader\b/i,
  /\bassistive tech(nology)? (daily|user)\b/i,
];

/**
 * Phrases that ASK the model for an accessibility verdict.
 *
 * Deliberately not a bare /WCAG/ match: both prompts must *mention* WCAG in
 * order to forbid it ("do not report any WCAG success-criterion number"), so a
 * naive keyword test flags the prohibition as if it were the offence. These
 * target the imperative forms the old prompts actually used — see the strings
 * quoted in each case, all lifted verbatim from the pre-2026-07-15 code.
 */
const VERDICT_PATTERNS = [
  /classify its WCAG violation/i, // was in the "James" prompt
  /accessibility score \(1-10\)/i, // was in the "James" prompt
  /based on WCAG [\d.]+ compliance/i, // was in the "David" prompt
  /Flag every instance where color is the only differentiator/i, // was in "David"
  /provide a structured summary:\s*\n- Accessibility score/i,
  /Rate each interaction for color-independence/i, // was in "David"
];

describe("no persona simulates a disabled user", () => {
  for (const persona of allPersonas) {
    it(`${persona.id} does not claim a disability`, () => {
      const haystack = `${persona.name} ${persona.description} ${persona.systemPrompt}`;
      for (const pattern of SIMULATION_PATTERNS) {
        expect(haystack, `${persona.id} matched ${pattern}`).not.toMatch(pattern);
      }
    });
  }
});

describe("no persona renders an accessibility verdict", () => {
  for (const persona of allPersonas) {
    it(`${persona.id} is never asked to judge compliance`, () => {
      for (const pattern of VERDICT_PATTERNS) {
        expect(persona.systemPrompt, `${persona.id} matched ${pattern}`).not.toMatch(pattern);
      }
    });

    // Stronger than the absence check above: silence about accessibility would
    // also pass that, and a model left to its own devices will volunteer a WCAG
    // opinion. Every prompt must actively forbid it.
    it(`${persona.id} is explicitly forbidden from judging accessibility`, () => {
      expect(persona.systemPrompt, persona.id).toMatch(
        /must NOT judge accessibility|must not attempt it|NOT your job/i,
      );
    });
  }
});

describe("traversal profiles", () => {
  const traversals = allPersonas.filter((p) => p.kind === "traversal");

  it("at least one exists — reachability is the product", () => {
    expect(traversals.length).toBeGreaterThan(0);
  });

  for (const persona of traversals) {
    it(`${persona.id} refuses to present as a person`, () => {
      expect(persona.systemPrompt).toMatch(/not a person/i);
      expect(persona.systemPrompt).toMatch(/must not attempt it|NOT your job/i);
    });

    it(`${persona.id} states that axe renders the verdict`, () => {
      expect(persona.systemPrompt).toMatch(/axe-core/i);
    });
  }
});

describe("ux profiles", () => {
  const ux = allPersonas.filter((p) => p.kind === "ux");

  it("are told their findings are opinion, not compliance", () => {
    for (const persona of ux) {
      expect(persona.systemPrompt, persona.id).toMatch(/opinion/i);
    }
  });

  it("are told not to speculate about disabled users", () => {
    for (const persona of ux) {
      expect(persona.systemPrompt, persona.id).toMatch(/disabled person|do not speculate/i);
    }
  });
});

describe("generateSystemPrompt", () => {
  const base = {
    id: "t",
    name: "T",
    description: "a tester",
    goals: ["reach checkout"],
    frustrations: ["slow"],
    techProficiency: 3 as const,
    viewport: { width: 1440, height: 900 },
    isMobile: false,
    connectionSpeed: "fast" as const,
    inputModality: "pointer" as const,
    maxSteps: 10,
    patienceLevel: "medium" as const,
  };

  it("branches on kind", () => {
    const ux = generateSystemPrompt({ ...base, kind: "ux" });
    const traversal = generateSystemPrompt({ ...base, kind: "traversal" });
    expect(ux).toMatch(/You are T, a tester/);
    expect(traversal).not.toMatch(/You are T/);
    expect(traversal).toMatch(/automated browser-driving test harness/i);
  });

  it("applies the keyboard constraint mechanically, without invoking a disability", () => {
    const prompt = generateSystemPrompt({ ...base, kind: "traversal", inputModality: "keyboard" });
    expect(prompt).toMatch(/KEYBOARD ONLY/);
    expect(prompt).toMatch(/with Tab, then sends Enter or Space/);
    expect(prompt).toMatch(/bounded Tab search failure does not prove/);
    for (const pattern of SIMULATION_PATTERNS) {
      expect(prompt).not.toMatch(pattern);
    }
  });

  it("omits the keyboard constraint for pointer profiles", () => {
    expect(generateSystemPrompt({ ...base, kind: "ux" })).not.toMatch(/KEYBOARD ONLY/);
  });
});

describe("category registry", () => {
  it("references only personas that exist", () => {
    for (const [category, ids] of Object.entries(personasByCategory)) {
      for (const id of ids) {
        expect(isBuiltinPersonaId(id), `${category} -> ${id}`).toBe(true);
        if (isBuiltinPersonaId(id)) {
          expect(personaLibrary[id], `${category} -> ${id}`).toBeDefined();
        }
      }
    }
  });

  it("has no 'accessibility' persona category — axe owns that verdict", () => {
    expect(personasByCategory.accessibility).toBeUndefined();
  });
});
