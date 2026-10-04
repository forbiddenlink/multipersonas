import { describe, expect, it } from "vitest";
import { groupPriority, type PriorityInput } from "@/lib/priority-groups";

const item = (over: Partial<PriorityInput>): PriorityInput => ({
  id: "1",
  ruleId: "color-contrast",
  title: "Contrast",
  severity: "serious",
  priorityScore: 90,
  priorityReason: "1 blocked persona reached this state",
  locations: ["https://a.test/"],
  ...over,
});

describe("groupPriority", () => {
  it("collapses findings of one rule into a single entry with page and issue counts", () => {
    const groups = groupPriority([
      item({ id: "1", locations: ["https://a.test/"] }),
      item({ id: "2", locations: ["https://a.test/b"] }),
      item({ id: "3", locations: ["https://a.test/b, https://a.test/c"] }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ ruleId: "color-contrast", issues: 3, pages: 3, priorityScore: 90 });
  });

  it("returns the top N different problems, scored by the best member", () => {
    const groups = groupPriority(
      [
        item({ id: "1", ruleId: "a", priorityScore: 90 }),
        item({ id: "2", ruleId: "a", priorityScore: 90 }),
        item({ id: "3", ruleId: "a", priorityScore: 90 }),
        item({ id: "4", ruleId: "b", priorityScore: 80, severity: "critical" }),
        item({ id: "5", ruleId: "c", priorityScore: 70 }),
        item({ id: "6", ruleId: "d", priorityScore: 60 }),
      ],
      3,
    );
    expect(groups.map((g) => g.ruleId)).toEqual(["a", "b", "c"]);
  });

  it("takes the most severe severity and the reason of the highest-scoring member", () => {
    const [g] = groupPriority([
      item({ id: "1", severity: "minor", priorityScore: 40, priorityReason: "low" }),
      item({ id: "2", severity: "critical", priorityScore: 95, priorityReason: "high" }),
    ]);
    expect(g).toMatchObject({ severity: "critical", priorityScore: 95, priorityReason: "high" });
  });

  it("groups rows without a rule id by title", () => {
    const groups = groupPriority([
      item({ id: "1", ruleId: null, title: "Legacy" }),
      item({ id: "2", ruleId: null, title: "Legacy" }),
      item({ id: "3", ruleId: null, title: "Other" }),
    ]);
    expect(groups.map((g) => [g.title, g.issues])).toEqual([["Legacy", 2], ["Other", 1]]);
  });
});
