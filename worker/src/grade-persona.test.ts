import { describe, expect, it } from "vitest";
import { personaLibrary } from "../../src/personas/library.js";
import {
  GRADE_PERSONA_ID,
  GRADE_PERSONA_MAX_STEPS,
  gradePersonaDailyCap,
  gradePersonaEnabled,
  gradePersonaPlan,
  selectGradePersona,
  summarizeGradePersona,
  type GradePersonaInput,
} from "./grade-persona.js";

describe("gradePersonaEnabled", () => {
  it("is on only for the exact string 1", () => {
    expect(gradePersonaEnabled({ GRADE_PERSONA_ENABLED: "1" })).toBe(true);
  });
  it.each([undefined, "", "0", "true", "yes", " 1", "1 ", "on"])("is off for %j", (v) => {
    expect(gradePersonaEnabled({ GRADE_PERSONA_ENABLED: v })).toBe(false);
  });
});

describe("gradePersonaDailyCap", () => {
  it("defaults to 50", () => {
    expect(gradePersonaDailyCap({})).toBe(50);
  });
  it("reads a positive integer", () => {
    expect(gradePersonaDailyCap({ GRADE_PERSONA_DAILY_CAP: "7" })).toBe(7);
  });
  it.each(["", "0", "-3", "abc"])("falls back to the default for %j", (v) => {
    expect(gradePersonaDailyCap({ GRADE_PERSONA_DAILY_CAP: v })).toBe(50);
  });
});

describe("gradePersonaPlan", () => {
  it("skips without touching the counter when the flag is off", async () => {
    let calls = 0;
    const plan = await gradePersonaPlan({}, async () => { calls++; return true; });
    expect(plan).toBe("off");
    expect(calls).toBe(0);
  });
  it("runs when the flag is on and the counter allows", async () => {
    expect(await gradePersonaPlan({ GRADE_PERSONA_ENABLED: "1" }, async () => true)).toBe("run");
  });
  it("passes the configured cap to the counter", async () => {
    let seen = 0;
    await gradePersonaPlan({ GRADE_PERSONA_ENABLED: "1", GRADE_PERSONA_DAILY_CAP: "3" }, async (cap) => { seen = cap; return true; });
    expect(seen).toBe(3);
  });
  it("falls back to axe-only when the daily cap is hit", async () => {
    expect(await gradePersonaPlan({ GRADE_PERSONA_ENABLED: "1" }, async () => false)).toBe("capped");
  });
  it("falls back to axe-only when the counter throws", async () => {
    const plan = await gradePersonaPlan({ GRADE_PERSONA_ENABLED: "1" }, async () => { throw new Error("db down"); });
    expect(plan).toBe("capped");
  });
});

describe("selectGradePersona", () => {
  it("picks a built-in ux persona and caps steps at 10", () => {
    const p = selectGradePersona(personaLibrary) as { id: string; kind: string; maxSteps: number };
    expect(p.id).toBe(GRADE_PERSONA_ID);
    expect(p.kind).toBe("ux");
    expect(p.maxSteps).toBeLessThanOrEqual(GRADE_PERSONA_MAX_STEPS);
  });
  it("lowers a larger step budget but never raises a smaller one", () => {
    const lib = { [GRADE_PERSONA_ID]: { id: GRADE_PERSONA_ID, maxSteps: 25 } };
    expect((selectGradePersona(lib) as { maxSteps: number }).maxSteps).toBe(10);
    const small = { [GRADE_PERSONA_ID]: { id: GRADE_PERSONA_ID, maxSteps: 4 } };
    expect((selectGradePersona(small) as { maxSteps: number }).maxSteps).toBe(4);
  });
  it("throws when the persona is missing, so the walk is recorded as not run", () => {
    expect(() => selectGradePersona({})).toThrow();
  });
});

const step = (n: number, reasoning?: string) => ({
  step: n, action: "click", detail: "", pageUrl: `https://x.test/${n}`, screenshotPath: `/o/s${n}.png`, timestamp: 0, reasoning,
});
const input = (over: Partial<GradePersonaInput> = {}): GradePersonaInput => ({
  persona: { id: "impatient-executive", name: "Rachel", description: "a busy VP on her phone" },
  goalCompleted: false,
  totalSteps: 3,
  steps: [step(1, "I see the headline."), step(2), step(3, "I cannot find pricing anywhere.")],
  ...over,
});

describe("summarizeGradePersona", () => {
  it("marks a missed goal as stuck, with the last frame and last quote", () => {
    const s = summarizeGradePersona(input());
    expect(s.outcome).toBe("stuck");
    expect(s.stuckStep?.screenshotPath).toBe("/o/s3.png");
    expect(s.stuckStep?.pageUrl).toBe("https://x.test/3");
    expect(s.quotes).toEqual(["I see the headline.", "I cannot find pricing anywhere."]);
  });
  it("marks a completed goal as reached with no stuck frame", () => {
    const s = summarizeGradePersona(input({ goalCompleted: true }));
    expect(s.outcome).toBe("reached");
    expect(s.stuckStep).toBeNull();
  });
  it("is inconclusive when the persona never took a step", () => {
    const s = summarizeGradePersona(input({ steps: [], totalSteps: 0 }));
    expect(s.outcome).toBe("inconclusive");
    expect(s.quotes).toEqual([]);
    expect(s.stuckStep).toBeNull();
  });
  it("keeps at most two quotes and truncates long ones", () => {
    const long = "word ".repeat(200);
    const s = summarizeGradePersona(input({ steps: [step(1, long), step(2, "b"), step(3, "c")] }));
    expect(s.quotes).toHaveLength(2);
    expect(s.quotes[0]!.length).toBeLessThanOrEqual(240);
  });
  it("drops quotes that make an accessibility or conformance claim", () => {
    const s = summarizeGradePersona(input({ steps: [step(1, "This fails WCAG and is not compliant."), step(2, "Pricing is hard to find.")] }));
    expect(s.quotes).toEqual(["Pricing is hard to find."]);
  });
});
