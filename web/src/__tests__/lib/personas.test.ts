import { describe, it, expect } from "vitest";
import { PERSONA_DATA, PERSONA_IDS } from "@/lib/personas";

describe("PERSONA_DATA", () => {
  it("has exactly 3 personas", () => {
    expect(Object.keys(PERSONA_DATA)).toHaveLength(3);
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

  it("has the expected persona IDs", () => {
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
