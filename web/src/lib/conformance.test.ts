import { describe, it, expect } from "vitest";
import { buildConformance, type CatalogCriterion } from "./conformance";

// Small fixture catalog — the engine takes the catalog as input, so it's tested
// independently of the real W3C data.
const CATALOG: CatalogCriterion[] = [
  { code: "1.1.1", level: "A", name: "Non-text Content" }, // axe-testable
  { code: "1.4.3", level: "AA", name: "Contrast (Minimum)" }, // axe-testable
  { code: "2.4.7", level: "AA", name: "Focus Visible" }, // axe-testable
  { code: "2.4.5", level: "AA", name: "Multiple Ways" }, // NOT axe-testable
  { code: "3.2.6", level: "A", name: "Consistent Help" }, // NOT axe-testable (2.2 add)
];
const AXE_TESTABLE = new Set(["1.1.1", "1.4.3", "2.4.7"]);

const v = (...codes: string[]) => ({
  criteria: codes.map((code) => ({ code, name: code })),
});

describe("buildConformance — the honest 3-way mapping", () => {
  it("marks a criterion with a violation Does Not Support, with the violation count", () => {
    const r = buildConformance([v("1.4.3")], CATALOG, AXE_TESTABLE);
    const row = r.rows.find((x) => x.code === "1.4.3")!;
    expect(row.status).toBe("does-not-support");
    expect(row.violationCount).toBe(1);
  });

  it("marks an axe-testable, violation-free criterion Partially Supports — never bare Supports", () => {
    const r = buildConformance([v("1.4.3")], CATALOG, AXE_TESTABLE);
    const row = r.rows.find((x) => x.code === "1.1.1")!; // testable, no violation
    expect(row.status).toBe("partially-supports");
    expect(row.violationCount).toBe(0);
    // The honesty guarantee: automation alone never yields a full "supports".
    expect(r.rows.some((x) => (x.status as string) === "supports")).toBe(false);
  });

  it("marks a criterion axe cannot test Needs Manual Review", () => {
    const r = buildConformance([v("1.4.3")], CATALOG, AXE_TESTABLE);
    for (const code of ["2.4.5", "3.2.6"]) {
      expect(r.rows.find((x) => x.code === code)!.status).toBe("needs-manual-review");
    }
  });

  it("aggregates the count when multiple verdicts touch the same criterion", () => {
    const r = buildConformance([v("1.4.3"), v("1.4.3", "1.1.1")], CATALOG, AXE_TESTABLE);
    expect(r.rows.find((x) => x.code === "1.4.3")!.violationCount).toBe(2);
    // 1.1.1 was touched by one verdict -> does-not-support with count 1
    expect(r.rows.find((x) => x.code === "1.1.1")!.status).toBe("does-not-support");
    expect(r.rows.find((x) => x.code === "1.1.1")!.violationCount).toBe(1);
  });

  it("covers every catalog criterion exactly once and counts sum to the total", () => {
    const r = buildConformance([v("1.4.3")], CATALOG, AXE_TESTABLE);
    expect(r.rows).toHaveLength(CATALOG.length);
    expect(r.totalCriteria).toBe(CATALOG.length);
    const sum =
      r.counts["does-not-support"] +
      r.counts["partially-supports"] +
      r.counts["needs-manual-review"];
    expect(sum).toBe(CATALOG.length);
  });

  it("ignores a violation for a code that isn't in the catalog (never crashes / invents a row)", () => {
    const r = buildConformance([v("9.9.9")], CATALOG, AXE_TESTABLE);
    expect(r.rows).toHaveLength(CATALOG.length);
    expect(r.counts["does-not-support"]).toBe(0);
  });

  it("with no findings, nothing Does Not Support (all partial or manual)", () => {
    const r = buildConformance([], CATALOG, AXE_TESTABLE);
    expect(r.counts["does-not-support"]).toBe(0);
    expect(r.counts["partially-supports"]).toBe(3); // the 3 axe-testable
    expect(r.counts["needs-manual-review"]).toBe(2);
  });
});

import { WCAG22_AA_CATALOG } from "./wcag-catalog";
import { AXE_TESTABLE_CODES } from "./wcag";

describe("WCAG 2.2 A+AA catalog integrity", () => {
  it("has exactly 55 criteria (31 A, 24 AA) and no 4.1.1 (removed in 2.2)", () => {
    expect(WCAG22_AA_CATALOG).toHaveLength(55);
    expect(WCAG22_AA_CATALOG.filter((c) => c.level === "A")).toHaveLength(31);
    expect(WCAG22_AA_CATALOG.filter((c) => c.level === "AA")).toHaveLength(24);
    expect(WCAG22_AA_CATALOG.some((c) => c.code === "4.1.1")).toBe(false);
  });

  it("every axe-testable code maps to a real catalog criterion (no orphan tags)", () => {
    const codes = new Set(WCAG22_AA_CATALOG.map((c) => c.code));
    for (const code of AXE_TESTABLE_CODES) {
      expect(codes.has(code), `axe-testable ${code} missing from catalog`).toBe(true);
    }
  });

  it("real catalog + no findings: every axe-testable SC is partial, the rest need manual review", () => {
    const r = buildConformance([], WCAG22_AA_CATALOG, AXE_TESTABLE_CODES);
    expect(r.counts["partially-supports"]).toBe(AXE_TESTABLE_CODES.size);
    expect(r.counts["needs-manual-review"]).toBe(55 - AXE_TESTABLE_CODES.size);
    expect(r.counts["does-not-support"]).toBe(0);
  });
});
