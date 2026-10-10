import { describe, it, expect } from "vitest";
import { buildScanJson } from "./json.js";
import type { Finding } from "../agent/engine.js";

const f = (ruleId: string, target: string, over: Partial<Finding> = {}): Finding => ({
  severity: "serious", category: "accessibility", title: `${ruleId} help`, description: "", recommendation: "",
  pageUrl: "https://x/", ruleId, target, seenOn: ["https://x/", "https://x/a"],
  wcagTags: ["wcag2aa", "wcag143", "cat.color"], ...over,
});

const base = { url: "https://x/", version: "9.9.9", pagesVisited: ["https://x/"], skipped: [], fixed: [] as string[] };

describe("buildScanJson", () => {
  it("carries tool, axe and target metadata", () => {
    const j = buildScanJson({ ...base, findings: [], baselineKeys: null, now: new Date("2026-01-02T03:04:05Z") });
    expect(j.tool).toEqual({ name: "personaudit", version: "9.9.9" });
    expect(j.axeCoreVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(j.target).toBe("https://x/");
    expect(j.timestamp).toBe("2026-01-02T03:04:05.000Z");
    expect(j.states.scanned).toEqual(["https://x/"]);
  });

  it("keys defects by the stable defect key and keeps only WCAG criterion tags", () => {
    const j = buildScanJson({ ...base, findings: [f("color-contrast", "#mantine-abcdef12 > p")], baselineKeys: null });
    expect(j.defects[0]).toMatchObject({
      key: "color-contrast|#mantine-* > p",
      ruleId: "color-contrast",
      impact: "serious",
      help: "color-contrast help",
      wcagTags: ["wcag143"],
      selector: "#mantine-abcdef12 > p",
      states: ["https://x/", "https://x/a"],
    });
  });

  it("marks every defect new without a baseline", () => {
    const j = buildScanJson({ ...base, findings: [f("a", "1"), f("b", "2")], baselineKeys: null });
    expect(j.baseline).toBeNull();
    expect(j.summary).toEqual({ total: 2, new: 2, fixed: 0, stillOpen: 0 });
  });

  it("splits new from still-open against a baseline and reports fixed keys", () => {
    const j = buildScanJson({
      ...base, findings: [f("a", "1"), f("b", "2")], baselineKeys: new Set(["a|1", "gone|9"]),
      baselinePath: "b.json", fixed: ["gone|9"],
    });
    expect(j.baseline).toBe("b.json");
    expect(j.defects.map((d) => d.isNew)).toEqual([false, true]);
    expect(j.summary).toEqual({ total: 2, new: 1, fixed: 1, stillOpen: 1 });
    expect(j.fixed).toEqual(["gone|9"]);
  });
});
