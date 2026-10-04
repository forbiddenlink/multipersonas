import { describe, expect, it } from "vitest";
import type { GradeRuleHit } from "@engine/grader/score";
import { FIX_FIRST_LIMIT, fixFirstScore, rankFixFirst } from "@/lib/grade-fix-first";
import { RULE_FIXES } from "@/components/dossier/grade-remediation";

const rule = (over: Partial<GradeRuleHit> = {}): GradeRuleHit => ({
  id: "button-name",
  impact: "critical",
  nodes: 1,
  help: "Buttons must have discernible text",
  wcagAA: true,
  pages: 1,
  ...over,
});

const BUTTON_NAME = RULE_FIXES["button-name"]!;

function one<T>(xs: T[]): T {
  const x = xs[0];
  if (x === undefined) throw new Error("expected one item");
  return x;
}
function two<T>(xs: T[]): [T, T] {
  const [a, b] = xs;
  if (a === undefined || b === undefined) throw new Error("expected two items");
  return [a, b];
}

describe("fixFirstScore", () => {
  it("is severity weight x pages x (1 + log2 nodes)", () => {
    expect(fixFirstScore(rule({ impact: "serious", pages: 3, nodes: 8 }))).toBe(2 * 3 * 4);
  });
  it("ranks a critical on one page above a minor on one page", () => {
    expect(fixFirstScore(rule({ impact: "critical" }))).toBeGreaterThan(fixFirstScore(rule({ impact: "minor" })));
  });
  it("lets reach beat severity: serious on 5 pages outranks critical on 1", () => {
    expect(fixFirstScore(rule({ impact: "serious", pages: 5 }))).toBeGreaterThan(fixFirstScore(rule({ impact: "critical", pages: 1 })));
  });
  it("damps node count so a flood of minors cannot bury a critical", () => {
    expect(fixFirstScore(rule({ impact: "minor", nodes: 200 }))).toBeLessThan(fixFirstScore(rule({ impact: "critical", nodes: 3 })) * 4);
  });
  it("treats a report without page counts as one page", () => {
    expect(fixFirstScore(rule({ pages: undefined }))).toBe(fixFirstScore(rule({ pages: 1 })));
  });
});

describe("rankFixFirst", () => {
  it("returns at most three items, highest score first", () => {
    const items = rankFixFirst([
      rule({ id: "a", impact: "minor" }),
      rule({ id: "b", impact: "critical", pages: 4 }),
      rule({ id: "c", impact: "serious", pages: 2 }),
      rule({ id: "d", impact: "moderate" }),
      rule({ id: "e", impact: "critical", pages: 1 }),
    ]);
    expect(items).toHaveLength(FIX_FIRST_LIMIT);
    expect(items.map((i) => i.ruleId)).toEqual(["b", "c", "e"]);
  });

  it("skips axe best-practice rules, which do not set the grade", () => {
    const items = rankFixFirst([rule({ id: "region", wcagAA: false, impact: "critical", pages: 9 }), rule({ id: "x", impact: "minor" })]);
    expect(items.map((i) => i.ruleId)).toEqual(["x"]);
  });

  it("returns nothing when there are no rules (clean or older report)", () => {
    expect(rankFixFirst([])).toEqual([]);
    expect(rankFixFirst(undefined)).toEqual([]);
  });

  it("breaks ties by node count, then rule id, so the order is stable", () => {
    const items = rankFixFirst([rule({ id: "z", nodes: 1 }), rule({ id: "a", nodes: 1 }), rule({ id: "m", nodes: 1, pages: 1 })]);
    expect(items.map((i) => i.ruleId)).toEqual(["a", "m", "z"]);
  });

  it("uses the plain title for known rules and axe help text otherwise", () => {
    const [known, unknown] = two(rankFixFirst([
      rule({ id: "button-name", impact: "critical" }),
      rule({ id: "some-new-rule", impact: "serious", help: "Elements must do the thing" }),
    ]));
    expect(known.title).toBe(BUTTON_NAME.title);
    expect(known.title).not.toMatch(/button-name/);
    expect(unknown.title).toBe("Elements must do the thing");
  });

  it("explains who is affected from the rule's own text, or axe help for unknown rules", () => {
    const [known, unknown] = two(rankFixFirst([
      rule({ id: "button-name", impact: "critical" }),
      rule({ id: "some-new-rule", impact: "serious", help: "Elements must do the thing" }),
    ]));
    expect(known.why).toBe(BUTTON_NAME.why);
    expect(known.fix).toBe(BUTTON_NAME.fix);
    expect(unknown.why).toBe("Elements must do the thing");
    expect(unknown.fix).toBeUndefined();
  });

  it("carries the shared selector so the UI can say fix once, clears N pages", () => {
    const item = one(rankFixFirst([rule({ pages: 4, sharedTarget: { target: "header .menu-btn", pages: 3 } })]));
    expect(item.shared).toEqual({ target: "header .menu-btn", pages: 3 });
    expect(item.pages).toEqual({ count: 4, exact: true });
  });

  it("estimates pages from example urls on older reports and marks it a lower bound", () => {
    const item = one(rankFixFirst([
      rule({
        pages: undefined,
        nodes: 5,
        examples: [
          { url: "https://x.test/", target: "a", html: "" },
          { url: "https://x.test/about", target: "b", html: "" },
          { url: "https://x.test/", target: "c", html: "" },
        ],
      }),
    ]));
    expect(item.pages).toEqual({ count: 2, exact: false });
    expect(item.shared).toBeUndefined();
  });

  it("falls back to one page for an old rule with no examples", () => {
    const item = one(rankFixFirst([rule({ pages: undefined, examples: undefined })]));
    expect(item.pages).toEqual({ count: 1, exact: false });
  });
});

describe("remediation titles", () => {
  it("gives every known rule a plain title with no em dash", () => {
    for (const [id, fix] of Object.entries(RULE_FIXES)) {
      expect(fix.title.length, id).toBeGreaterThan(3);
      expect(fix.title, id).not.toMatch(/—/);
    }
  });
});
