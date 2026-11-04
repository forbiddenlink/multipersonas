import { describe, expect, it } from "vitest";
import { parseGradePersona, personaOutcomeLine, PERSONA_PENDING_WINDOW_MS } from "@/lib/grade-persona";

const NOW = Date.parse("2026-11-04T12:00:00Z");
const JOB = "11111111-2222-3333-4444-555555555555";
const done = (over: Record<string, unknown> = {}) => ({
  status: "completed", outcome: "stuck", totalSteps: 7, personaName: "Rachel",
  personaDescription: "a busy VP", quotes: ["a", "b"], stuckScreenshotPath: `grade/${JOB}/stuck.png`,
  stuckPageUrl: "https://x.test/pricing", ...over,
});

describe("parseGradePersona", () => {
  it.each([undefined, null, "x", 3, [], {}, { status: "weird" }])("returns null (show nothing) for %j", (raw) => {
    expect(parseGradePersona(raw, NOW)).toBeNull();
  });

  it("is pending while a fresh run is in flight", () => {
    const startedAt = new Date(NOW - 30_000).toISOString();
    expect(parseGradePersona({ status: "running", startedAt }, NOW)).toEqual({ kind: "pending" });
  });
  it("reads a stale running row as not run, so the page never waits forever", () => {
    const startedAt = new Date(NOW - PERSONA_PENDING_WINDOW_MS - 1).toISOString();
    expect(parseGradePersona({ status: "running", startedAt }, NOW)).toEqual({ kind: "not_run" });
    expect(parseGradePersona({ status: "running" }, NOW)).toEqual({ kind: "not_run" });
  });
  it("reads a failed walk as not run", () => {
    expect(parseGradePersona({ status: "failed" }, NOW)).toEqual({ kind: "not_run" });
  });

  it("returns a ready view with the stuck frame", () => {
    expect(parseGradePersona(done(), NOW)).toEqual({
      kind: "ready", outcome: "stuck", totalSteps: 7, personaName: "Rachel", personaDescription: "a busy VP",
      quotes: ["a", "b"], screenshotPath: `grade/${JOB}/stuck.png`, pageUrl: "https://x.test/pricing",
    });
  });
  it("drops a screenshot path outside the grade/ prefix", () => {
    const v = parseGradePersona(done({ stuckScreenshotPath: "../other/secret.png" }), NOW);
    expect(v).toMatchObject({ kind: "ready", screenshotPath: null });
  });
  it("shows no frame when the visitor finished", () => {
    expect(parseGradePersona(done({ outcome: "reached" }), NOW)).toMatchObject({ screenshotPath: null });
  });
  it("caps quotes at two and ignores non-strings", () => {
    const v = parseGradePersona(done({ quotes: ["a", 5, "", "b", "c"] }), NOW);
    expect(v).toMatchObject({ quotes: ["a", "b"] });
  });
  it("treats an unknown outcome as not run", () => {
    expect(parseGradePersona(done({ outcome: "great" }), NOW)).toEqual({ kind: "not_run" });
  });
});

describe("personaOutcomeLine", () => {
  it("uses plain navigation language with no verdict words", () => {
    for (const o of ["reached", "stuck", "inconclusive"] as const) {
      const line = personaOutcomeLine(o, 1);
      expect(line).not.toMatch(/compliant|wcag|—|–/i);
    }
    expect(personaOutcomeLine("stuck", 1)).toBe("It got stuck after 1 step.");
    expect(personaOutcomeLine("reached", 4)).toBe("It found what it came for in 4 steps.");
  });
});
