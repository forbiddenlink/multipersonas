import { describe, it, expect } from "vitest";
import { groupFindingsByRule } from "@/lib/audit-rules";

const f = (rule_id: string | null, severity: string, page_url: string | null, title = rule_id ?? "t") => ({
  rule_id,
  severity,
  page_url,
  title,
});

describe("groupFindingsByRule", () => {
  it("counts defects per rule and distinct pages across comma-joined locations", () => {
    const groups = groupFindingsByRule([
      f("color-contrast", "serious", "https://a.test/, https://a.test/b"),
      f("color-contrast", "serious", "https://a.test/b"),
      f("image-alt", "critical", "https://a.test/"),
    ]);
    expect(groups.map((g) => [g.key, g.count, g.pages])).toEqual([
      ["image-alt", 1, 1],
      ["color-contrast", 2, 2],
    ]);
  });

  it("keeps the most severe severity seen for a rule", () => {
    const [g] = groupFindingsByRule([f("r", "minor", null), f("r", "critical", null)]) as [ReturnType<typeof groupFindingsByRule>[number]];
    expect(g.severity).toBe("critical");
    expect(g.pages).toBe(0);
  });

  it("falls back to the title for rows without a rule id and sorts unknown severities last", () => {
    const groups = groupFindingsByRule([f(null, "weird", null, "Legacy"), f("a", "minor", null)]);
    expect(groups.map((g) => g.key)).toEqual(["a", "Legacy"]);
  });
});
