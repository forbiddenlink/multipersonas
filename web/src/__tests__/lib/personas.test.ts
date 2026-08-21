import { describe, it, expect } from "vitest";
import { personaDisplayRegistry } from "@engine/personas/library";
import {
  PERSONA_DATA,
  PERSONA_IDS,
  DEFAULT_PERSONA_IDS,
  MAX_PERSONAS,
} from "@/lib/personas";

describe("PERSONA_DATA", () => {
  it("derives id/name/description from the engine display registry", () => {
    expect(PERSONA_IDS).toEqual(Object.keys(personaDisplayRegistry));
    for (const id of PERSONA_IDS) {
      expect(PERSONA_DATA[id].id).toBe(personaDisplayRegistry[id].id);
      expect(PERSONA_DATA[id].name).toBe(personaDisplayRegistry[id].name);
      expect(PERSONA_DATA[id].description).toBe(personaDisplayRegistry[id].description);
    }
  });

  it("has required fields on every persona", () => {
    for (const id of PERSONA_IDS) {
      const persona = PERSONA_DATA[id];
      expect(persona.id).toBe(id);
      expect(persona.name).toBeTruthy();
      expect(persona.role).toBeTruthy();
      expect(persona.description).toBeTruthy();
    }
  });

  it("includes the three core persona IDs", () => {
    expect(PERSONA_IDS).toContain("first-time-visitor");
    expect(PERSONA_IDS).toContain("keyboard-traversal");
    expect(PERSONA_IDS).toContain("mobile-slow-connection");
  });

  it("persona IDs match their object keys", () => {
    for (const id of PERSONA_IDS) {
      expect(PERSONA_DATA[id].id).toBe(id);
    }
  });
});

describe("PERSONA_IDS", () => {
  it("is an array of strings", () => {
    expect(Array.isArray(PERSONA_IDS)).toBe(true);
    for (const id of PERSONA_IDS) {
      expect(typeof id).toBe("string");
    }
  });

  it("matches keys of PERSONA_DATA", () => {
    expect(PERSONA_IDS).toEqual(Object.keys(PERSONA_DATA));
  });
});

describe("selection defaults", () => {
  it("defaults are a subset of the selectable personas", () => {
    for (const id of DEFAULT_PERSONA_IDS) {
      expect(PERSONA_IDS).toContain(id);
    }
  });

  it("defaults do not exceed the per-run cap", () => {
    expect(DEFAULT_PERSONA_IDS.length).toBeLessThanOrEqual(MAX_PERSONAS);
  });
});
