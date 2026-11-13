import { expect, it } from "vitest";
import { buildRecorderLanes, AXE_LANE_MAX_PAGES, type LaneFindingRow } from "@/lib/recorder-lanes";
import { buildPersonaOutcomes } from "@/lib/persona-outcomes";

// Fixture rows, not real scan output.
const step = (n: number, action: string, frustration: number, reasoning: string | null = null, screenshotUrl: string | null = null) => ({
  step: n, action, detail: null, reasoning, pageUrl: "https://x.test/", screenshotUrl, ts: "2026-01-01T00:00:00Z", frustration,
});
const journeyA = {
  personaId: "a", goalCompleted: true,
  steps: [step(0, "navigate", 5), step(1, "verify_task", 10), step(2, "finish", 0, "Done.")],
};
const journeyB = {
  personaId: "b", goalCompleted: false,
  steps: [step(0, "navigate", 5), step(1, "click", 70, "Stuck.", "https://s/1"), step(2, "finish", 80, "Gave up: nothing.")],
};
const finding = (id: string, page: string | null, severity = "critical"): LaneFindingRow => ({
  id, severity, rule_id: "button-name", title: "Buttons need names", description: null, recommendation: null, page_url: page,
});

function lanes(over: Partial<Parameters<typeof buildRecorderLanes>[0]> = {}, journeys = [journeyA, journeyB], taskCheck = false) {
  const o = buildPersonaOutcomes({
    personaIds: journeys.map((j) => j.personaId), journeys, taskCheck,
    meta: (id) => ({ name: id, role: "Role", device: "375 x 812 · touch" }),
  });
  return buildRecorderLanes({
    cards: o.cards, journeys, notesByPersona: new Map(), axeFindings: [], ...over,
  });
}

it("caps the lane at six pages and counts the rest, plus findings with no page, as not shown", () => {
  const rows = [
    ...Array.from({ length: 8 }, (_, i) => finding(`f${i}`, `https://x.test/p${i}`)),
    finding("extra", "https://x.test/p0"),
    finding("nourl", null),
  ];
  const r = lanes({ axeFindings: rows });
  expect(AXE_LANE_MAX_PAGES).toBe(6);
  expect(r.axePages).toHaveLength(6);
  expect(r.axePages[0]!.items).toHaveLength(2);
  expect(r.axeNotShown).toBe(3);
});

it("handles zero personas", () => {
  const r = lanes({ axeFindings: [finding("1", "https://x.test/")] }, []);
  expect(r.personas).toEqual([]);
  expect(r.initialPersona).toBeUndefined();
  expect(r.initialStep).toBe(0);
  expect(r.axePages).toHaveLength(1);
});

it("handles zero axe pages", () => {
  const r = lanes({ axeFindings: [finding("1", null)] });
  expect(r.axePages).toEqual([]);
  expect(r.axeNotShown).toBe(1);
  expect(r.personas.map((p) => p.device)).toEqual(["375 x 812 · touch", "375 x 812 · touch"]);
});

it("handles a one-step journey", () => {
  const one = { personaId: "a", goalCompleted: true, steps: [step(0, "finish", 0, "Done.")] };
  const r = lanes({}, [one]);
  expect(r.personas[0]!.journey!.steps).toHaveLength(1);
  expect(r.initialStep).toBe(0);
});

it("opens on the first persona's evidence step with no deep link", () => {
  expect(lanes().initialStep).toBe(2); // reached: the final step
  expect(lanes({}, [journeyB, journeyA]).initialStep).toBe(1); // blocked with a screenshot: that frame
});

it("honours a deep link", () => {
  const r = lanes({ personaParam: "b", stepParam: "1" });
  expect(r.initialPersona).toBe("b");
  expect(r.initialStep).toBe(1);
  expect(lanes({ personaParam: "b", stepParam: "0" }).initialStep).toBe(0);
});

it("falls back to the evidence step when the link names a persona but no step", () => {
  expect(lanes({ personaParam: "b" }).initialStep).toBe(1);
});

it("evidence=task opens on the verification step", () => {
  expect(lanes({ personaParam: "a", evidence: "task", stepParam: "0" }).initialStep).toBe(1);
});

it("taskCheck mode keeps the text-check badges", () => {
  const r = lanes({}, [journeyA, journeyB], true);
  expect(r.personas.map((p) => p.badge)).toEqual(["text observed", "not verified"]);
});

it("flags the give-up finish tick with the shared stuck rule", async () => {
  const { stuckStepIndexes, isGiveUp } = await import("@/lib/persona-outcomes");
  const bare = { ...journeyB, steps: journeyB.steps.map((s) => ({ ...s, screenshotUrl: null })) };
  const r = lanes({}, [journeyA, bare]);
  const b = r.personas.find((p) => p.personaId === "b")!.journey!;
  expect(isGiveUp(b.steps[2]!)).toBe(true);
  expect(stuckStepIndexes(b).has(2)).toBe(true);
});
