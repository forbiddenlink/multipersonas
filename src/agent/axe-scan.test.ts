import { describe, it, expect, vi } from "vitest";

const { analyze, withTags } = vi.hoisted(() => ({ analyze: vi.fn(), withTags: vi.fn() }));

vi.mock("@axe-core/playwright", () => ({
  AxeBuilder: class {
    withTags(tags: string[]): this { withTags(tags); return this; }
    analyze = analyze;
  },
}));

import { mergeAxeFindings, runAxeScan } from "./axe-scan.js";
import type { Finding } from "./engine.js";
import { baselineFromFindings, evaluateGate } from "../crawler/gate.js";

const f = (over: Partial<Finding>): Finding => ({
  severity: "serious",
  category: "accessibility",
  title: "Links must have discernible text",
  description: "d",
  recommendation: "r",
  pageUrl: "https://x.test/a",
  ruleId: "link-name",
  target: "nav > a.logo",
  ...over,
});

describe("mergeAxeFindings", () => {
  /**
   * Regression for 2026-07-16: the report claimed "30 issues, 13 critical" on a
   * run with 14. axe findings were counted once per persona, so the headline
   * number scaled with how many personas you hired.
   */
  it("counts one defect once, however many states it appears in", () => {
    const merged = mergeAxeFindings([
      f({ pageUrl: "https://x.test/a", seenOn: ["https://x.test/a"] }),
      f({ pageUrl: "https://x.test/b", seenOn: ["https://x.test/b"] }),
      f({ pageUrl: "https://x.test/c", seenOn: ["https://x.test/c"] }),
    ]);
    expect(merged).toHaveLength(1);
  });

  it("records every state the defect was seen in, so a fix can be verified", () => {
    const merged = mergeAxeFindings([
      f({ seenOn: ["https://x.test/a"] }),
      f({ seenOn: ["https://x.test/b"] }),
    ]);
    expect(merged[0]!.seenOn).toEqual(["https://x.test/a", "https://x.test/b"]);
  });

  it("does not merge different rules on the same element", () => {
    expect(
      mergeAxeFindings([f({ ruleId: "link-name" }), f({ ruleId: "color-contrast" })]),
    ).toHaveLength(2);
  });

  it("does not merge the same rule on different elements — those are separate fixes", () => {
    expect(
      mergeAxeFindings([f({ target: "nav > a.logo" }), f({ target: "footer > a.tos" })]),
    ).toHaveLength(2);
  });

  it("does not mutate its input", () => {
    const a = f({ seenOn: ["https://x.test/a"] });
    mergeAxeFindings([a, f({ seenOn: ["https://x.test/b"] })]);
    expect(a.seenOn).toEqual(["https://x.test/a"]);
  });

  it("dedupes a repeated sighting in the same state", () => {
    const merged = mergeAxeFindings([f({ seenOn: ["https://x.test/a"] }), f({ seenOn: ["https://x.test/a"] })]);
    expect(merged[0]!.seenOn).toEqual(["https://x.test/a"]);
  });

  it("falls back to title+page for findings with no rule id", () => {
    const merged = mergeAxeFindings([
      f({ ruleId: undefined, target: undefined, seenOn: undefined }),
      f({ ruleId: undefined, target: undefined, seenOn: undefined }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.seenOn).toEqual(["https://x.test/a"]);
  });

  it("handles an empty list", () => {
    expect(mergeAxeFindings([])).toEqual([]);
  });
});

describe("runAxeScan", () => {
  it("requests WCAG 2.2 checks as well as earlier criteria", async () => {
    analyze.mockResolvedValueOnce({ violations: [] });
    await runAxeScan({ url: () => "https://example.test" } as never);
    expect(withTags).toHaveBeenLastCalledWith(expect.arrayContaining(["wcag22a", "wcag22aa"]));
  });

  it("lets the CI gate detect a sixth affected element beyond five baseline defects", async () => {
    const page = { url: () => "https://example.test" } as never;
    const nodes = Array.from({ length: 6 }, (_, i) => ({
      html: `<a class="link-${i}"></a>`,
      target: [`.link-${i}`],
    }));
    const violation = {
      id: "link-name", impact: "serious", help: "Links must have discernible text",
      description: "Links need accessible names", helpUrl: "https://example.test/rules/link-name",
      tags: ["wcag2a"], nodes,
    };
    analyze.mockResolvedValueOnce({ violations: [{ ...violation, nodes: nodes.slice(0, 5) }] });
    const baseline = baselineFromFindings(await runAxeScan(page));
    analyze.mockResolvedValueOnce({ violations: [violation] });

    const gate = evaluateGate(await runAxeScan(page), { failOn: "serious", baseline });
    expect(gate.passed).toBe(false);
    expect(gate.failing.map((finding) => finding.target)).toEqual([".link-5"]);
  });

  it("returns an empty list for a completed scan with no violations", async () => {
    analyze.mockResolvedValueOnce({ violations: [] });
    await expect(runAxeScan({ url: () => "https://example.test" } as never)).resolves.toEqual([]);
  });

  it("fails the run when axe cannot produce evidence", async () => {
    analyze.mockRejectedValueOnce(new Error("analysis unavailable"));
    await expect(runAxeScan({ url: () => "https://example.test" } as never))
      .rejects.toThrow("Accessibility scan failed for https://example.test: analysis unavailable");
  });
});
