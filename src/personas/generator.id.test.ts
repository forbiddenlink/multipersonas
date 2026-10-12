import { describe, it, expect } from "vitest";
import { generatedPersonaListSchema } from "./generator.js";

const base = {
  name: "n", description: "d", goals: [], frustrations: [], techProficiency: 3,
  viewport: { width: 1440, height: 900 }, isMobile: false, connectionSpeed: "fast",
  patienceLevel: "medium",
};

describe("generated persona schema (AIR-001 / AIR-002)", () => {
  it("rejects a path-traversal id", () => {
    const r = generatedPersonaListSchema.safeParse({ personas: [{ ...base, id: "../package", maxSteps: 10 }] });
    expect(r.success).toBe(false);
  });
  it("caps maxSteps at the library maximum (25)", () => {
    expect(generatedPersonaListSchema.safeParse({ personas: [{ ...base, id: "ok", maxSteps: 26 }] }).success).toBe(false);
    expect(generatedPersonaListSchema.safeParse({ personas: [{ ...base, id: "ok", maxSteps: 25 }] }).success).toBe(true);
  });
});
