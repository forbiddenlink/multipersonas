import { describe, expect, it } from "vitest";
import {
  buildPersonaOutcomes,
  describeDevice,
  outcomeBadge,
  outcomeHeadline,
  pickEvidenceStep,
  pickQuotes,
  rankStuckPoints,
  type OutcomeJourney,
  type OutcomeStep,
} from "./persona-outcomes";

function step(n: number, over: Partial<OutcomeStep> = {}): OutcomeStep {
  return {
    step: n,
    action: "click",
    detail: null,
    reasoning: null,
    pageUrl: `/p${n}`,
    screenshotUrl: `https://img/${n}.png`,
    frustration: 10,
    ...over,
  };
}

function journey(
  personaId: string,
  goalCompleted: boolean,
  steps: OutcomeStep[],
): OutcomeJourney {
  return { personaId, goalCompleted, steps };
}

describe("pickEvidenceStep", () => {
  it("returns null for an empty journey", () => {
    expect(pickEvidenceStep(journey("a", false, []))).toBeNull();
  });

  it("uses the give-up finish step when the persona gave up", () => {
    const j = journey("a", false, [
      step(1),
      step(2),
      step(3, {
        action: "finish",
        detail: "blocked",
        reasoning: "Gave up: repeated the same action without progress past this persona's patience.",
      }),
    ]);
    expect(pickEvidenceStep(j)?.step).toBe(3);
    // Engine step numbers start at 1; the replay deep link takes the array index.
    expect(pickEvidenceStep(j)?.index).toBe(2);
  });

  it("uses the last non-finish step before a blocked finish", () => {
    const j = journey("a", false, [
      step(1),
      step(2),
      step(3, { action: "finish", detail: "blocked", reasoning: "I could not find pricing." }),
    ]);
    expect(pickEvidenceStep(j)?.step).toBe(2);
  });

  it("falls back to the finish step when a blocked journey has only a finish", () => {
    const j = journey("a", false, [step(1, { action: "finish", detail: "blocked" })]);
    expect(pickEvidenceStep(j)?.step).toBe(1);
  });

  it("uses the final step for a persona that reached the goal", () => {
    const j = journey("a", true, [
      step(1),
      step(2, { action: "finish", detail: "achieved", reasoning: "Found it." }),
    ]);
    expect(pickEvidenceStep(j)?.step).toBe(2);
  });

  it("prefers the nearest step that has a screenshot", () => {
    const j = journey("a", false, [
      step(1),
      step(2, { screenshotUrl: null }),
      step(3, { action: "finish", detail: "blocked", screenshotUrl: null }),
    ]);
    expect(pickEvidenceStep(j)?.step).toBe(1);
  });

  it("returns a step without a screenshot when none has one", () => {
    const j = journey("a", false, [step(1, { screenshotUrl: null })]);
    expect(pickEvidenceStep(j)?.step).toBe(1);
    expect(pickEvidenceStep(j)?.screenshotUrl).toBeNull();
  });
});

describe("pickQuotes", () => {
  it("returns nothing when no step has reasoning", () => {
    expect(pickQuotes(journey("a", true, [step(1), step(2)]))).toEqual([]);
  });

  it("leads with the finish summary, then the most frustrated steps", () => {
    const j = journey("a", false, [
      step(1, { reasoning: "Looks fine.", frustration: 5 }),
      step(2, { reasoning: "The button does nothing.", frustration: 70 }),
      step(3, { reasoning: "Still stuck here.", frustration: 90 }),
      step(4, { action: "finish", detail: "blocked", reasoning: "I could not check out." }),
    ]);
    expect(pickQuotes(j)).toEqual([
      "I could not check out.",
      "Still stuck here.",
      "The button does nothing.",
    ]);
  });

  it("caps at the requested max and skips blank and duplicate text", () => {
    const j = journey("a", true, [
      step(1, { reasoning: "  ", frustration: 50 }),
      step(2, { reasoning: "Same.", frustration: 40 }),
      step(3, { reasoning: "Same.", frustration: 30 }),
      step(4, { reasoning: "Other.", frustration: 20 }),
    ]);
    expect(pickQuotes(j, 1)).toEqual(["Same."]);
    expect(pickQuotes(j)).toEqual(["Same.", "Other."]);
  });

  it("truncates long reasoning on a word boundary", () => {
    const long = "word ".repeat(100).trim();
    const [q] = pickQuotes(journey("a", true, [step(1, { reasoning: long })]));
    expect(q!.length).toBeLessThanOrEqual(221);
    expect(q!.endsWith("...")).toBe(true);
  });

  it("never emits an em dash", () => {
    const [q] = pickQuotes(journey("a", true, [step(1, { reasoning: "Stuck — again." })]));
    expect(q).not.toContain("—");
    expect(q).toBe("Stuck, again.");
  });
});

describe("rankStuckPoints", () => {
  it("returns nothing when no persona is stuck or frustrated", () => {
    const j = journey("a", true, [step(1), step(2, { action: "finish" })]);
    expect(rankStuckPoints([j])).toEqual([]);
  });

  it("groups blocked personas by page and ranks by personas affected", () => {
    const a = journey("a", false, [
      step(1, { pageUrl: "/cart", frustration: 80 }),
      step(2, { action: "finish", detail: "blocked", pageUrl: "/cart" }),
    ]);
    const b = journey("b", false, [
      step(1, { pageUrl: "/cart", frustration: 60 }),
      step(2, { action: "finish", detail: "blocked", pageUrl: "/cart" }),
    ]);
    const c = journey("c", false, [
      step(1, { pageUrl: "/pricing", frustration: 95 }),
      step(2, { action: "finish", detail: "blocked", pageUrl: "/pricing" }),
    ]);
    const ranked = rankStuckPoints([c, a, b]);
    expect(ranked.map((r) => r.pageUrl)).toEqual(["/cart", "/pricing"]);
    expect(ranked[0]).toMatchObject({
      personaIds: ["a", "b"],
      blockedPersonaIds: ["a", "b"],
      peakFrustration: 80,
    });
    expect(ranked[1]!.peakFrustration).toBe(95);
  });

  it("breaks ties by peak frustration", () => {
    const a = journey("a", false, [
      step(1, { pageUrl: "/x", frustration: 40 }),
      step(2, { action: "finish", detail: "blocked", pageUrl: "/x" }),
    ]);
    const b = journey("b", false, [
      step(1, { pageUrl: "/y", frustration: 90 }),
      step(2, { action: "finish", detail: "blocked", pageUrl: "/y" }),
    ]);
    expect(rankStuckPoints([a, b]).map((r) => r.pageUrl)).toEqual(["/y", "/x"]);
  });

  it("counts a persona once per page and includes frustrated personas that still reached the goal", () => {
    const a = journey("a", true, [
      step(1, { pageUrl: "/form", frustration: 70 }),
      step(2, { pageUrl: "/form", frustration: 75 }),
      step(3, { action: "finish", detail: "achieved", pageUrl: "/done", frustration: 0 }),
    ]);
    const [p] = rankStuckPoints([a]);
    expect(p).toMatchObject({ pageUrl: "/form", personaIds: ["a"], blockedPersonaIds: [], peakFrustration: 75 });
  });

  it("ignores steps with no page url and respects the limit", () => {
    const a = journey("a", false, [
      step(1, { pageUrl: null, frustration: 99 }),
      step(2, { action: "finish", detail: "blocked", pageUrl: null }),
    ]);
    expect(rankStuckPoints([a])).toEqual([]);
    const many = Array.from({ length: 8 }, (_, i) =>
      journey(`p${i}`, false, [step(1, { pageUrl: `/u${i}`, frustration: 80 }), step(2, { action: "finish", detail: "blocked", pageUrl: `/u${i}` })]),
    );
    expect(rankStuckPoints(many, { limit: 3 })).toHaveLength(3);
  });
});

describe("outcomeBadge", () => {
  it("uses goal wording by default", () => {
    expect(outcomeBadge(true, false)).toBe("reached");
    expect(outcomeBadge(false, false)).toBe("blocked");
    expect(outcomeBadge(null, false)).toBe("not verified");
  });

  it("uses text-check wording when a task check ran", () => {
    expect(outcomeBadge(true, true)).toBe("text observed");
    expect(outcomeBadge(false, true)).toBe("not verified");
    expect(outcomeBadge(null, true)).toBe("not verified");
  });
});

describe("outcomeHeadline", () => {
  it("states the count", () => {
    expect(outcomeHeadline(2, 3, false)).toBe("2 of 3 personas reached the goal");
    expect(outcomeHeadline(1, 1, false)).toBe("1 of 1 persona reached the goal");
    expect(outcomeHeadline(0, 3, true)).toBe("0 of 3 profiles matched the text check");
  });

  it("handles zero personas", () => {
    expect(outcomeHeadline(0, 0, false)).toBe("No persona results recorded");
  });
});

describe("buildPersonaOutcomes", () => {
  const meta = (id: string) => ({ name: `Name ${id}`, role: `Role ${id}`, device: "375 x 667 · touch" });

  it("builds a card per journey and counts reached", () => {
    const js = [
      journey("a", true, [step(1, { reasoning: "ok" }), step(2, { action: "finish", detail: "achieved" })]),
      journey("b", false, [step(1, { frustration: 80 }), step(2, { action: "finish", detail: "blocked" })]),
    ];
    const out = buildPersonaOutcomes({ personaIds: ["a", "b"], journeys: js, meta, taskCheck: false });
    expect(out.cards.map((c) => [c.personaId, c.badge])).toEqual([
      ["a", "reached"],
      ["b", "blocked"],
    ]);
    expect(out.reached).toBe(1);
    expect(out.total).toBe(2);
    expect(out.headline).toBe("1 of 2 personas reached the goal");
    expect(out.cards[1]!.evidence?.step).toBe(1);
  });

  it("renders from run data alone when there are no journeys", () => {
    const out = buildPersonaOutcomes({
      personaIds: ["a", "b"],
      journeys: [],
      meta,
      taskCheck: false,
      runTotals: { achieved: 1, total: 2 },
      notesByPersona: { a: ["Checkout button has no label."] },
    });
    expect(out.hasJourneys).toBe(false);
    expect(out.cards.map((c) => c.badge)).toEqual(["not verified", "not verified"]);
    expect(out.cards[0]!.quotes).toEqual(["Checkout button has no label."]);
    expect(out.cards[0]!.evidence).toBeNull();
    expect(out.stuckPoints).toEqual([]);
    expect(out.headline).toBe("1 of 2 personas reached the goal");
  });

  it("includes journey personas missing from persona_ids and keeps listed order first", () => {
    const js = [journey("z", true, [step(1, { action: "finish", detail: "achieved" })])];
    const out = buildPersonaOutcomes({ personaIds: ["a"], journeys: js, meta, taskCheck: false });
    expect(out.cards.map((c) => c.personaId)).toEqual(["a", "z"]);
    expect(out.cards[0]!.badge).toBe("not verified");
  });
});

describe("describeDevice", () => {
  const base = { viewport: { width: 1440, height: 900 }, inputModality: "pointer", isMobile: false, connectionSpeed: "fast" };

  it("labels a desktop pointer persona with size only plus input", () => {
    expect(describeDevice(base)).toBe("1440 x 900 · pointer");
  });

  it("labels keyboard and touch, and shows a slow connection", () => {
    expect(describeDevice({ ...base, inputModality: "keyboard" })).toBe("1440 x 900 · keyboard");
    expect(describeDevice({ ...base, viewport: { width: 375, height: 812 }, isMobile: true, connectionSpeed: "slow-3g" })).toBe(
      "375 x 812 · touch · slow-3g",
    );
  });
});
