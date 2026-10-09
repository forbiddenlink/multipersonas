import { describe, expect, it } from "vitest";
import { buildExecutiveSummary, type ExecutiveSummaryInput } from "./report-summary";

const base: ExecutiveSummaryInput = {
  scanCoverage: { checks: [{ url: "https://example.com", step: 0, status: "scanned" }], executionFailures: [] },
  severityCounts: { critical: 2, serious: 1, moderate: 0, minor: 3 },
  locationCount: 4,
  fixFirstTitles: ["Images missing alt text", "Dropdowns with no label", "Links with no name", "Low contrast"],
  history: { previousDate: "2026-09-28T10:00:00Z", newCount: 1, fixedCount: 3, stillOpenCount: 5 },
  personaSuccess: { reached: 2, total: 3 },
  manualReviewCount: 32,
  nextScanAt: "2026-10-12T05:00:00Z",
};

const fmt = (iso: string) => iso.slice(0, 10);

describe("buildExecutiveSummary", () => {
  it("leads with what automated checks found, by severity, and where", () => {
    const [first] = buildExecutiveSummary(base, fmt);
    expect(first).toBe(
      "Automated checks found 6 distinct issues on 4 pages or states: 2 critical, 1 serious, 3 minor.",
    );
  });

  it("names the first three things to fix", () => {
    expect(buildExecutiveSummary(base, fmt)).toContain(
      "Fix first: Images missing alt text; Dropdowns with no label; Links with no name.",
    );
  });

  it("reports the change since the previous scan", () => {
    expect(buildExecutiveSummary(base, fmt)).toContain(
      "Since the previous scan on 2026-09-28: 1 new, 3 fixed, 5 still open.",
    );
  });

  it("says a first scan sets the baseline instead of inventing a comparison", () => {
    const lines = buildExecutiveSummary({ ...base, history: { previousDate: null, newCount: 0, fixedCount: 0, stillOpenCount: 0 } }, fmt);
    expect(lines).toContain("This is the first scan of this site. Later scans are compared against it.");
    expect(lines.join(" ")).not.toMatch(/fixed/);
  });

  it("omits the comparison when the run is not in a project", () => {
    expect(buildExecutiveSummary({ ...base, history: null }, fmt).join(" ")).not.toMatch(/previous scan|first scan/);
  });

  it("handles a clean run without claiming conformance", () => {
    const lines = buildExecutiveSummary(
      { ...base, severityCounts: { critical: 0, serious: 0, moderate: 0, minor: 0 }, fixFirstTitles: [] },
      fmt,
    );
    expect(lines[0]).toBe("Automated checks found no violations in the states checked.");
    expect(lines.join(" ")).not.toMatch(/Fix first/);
    expect(lines.join(" ")).not.toMatch(/\bcompliant\b|conforms|fully accessible/i);
  });

  it("does not treat zero finding locations as zero scan coverage", () => {
    const [first] = buildExecutiveSummary({
      ...base, severityCounts: { critical: 0, serious: 0, moderate: 0, minor: 0 }, locationCount: 0,
    }, fmt);
    expect(first).not.toMatch(/0 pages|0 states/);
  });

  it("states the manual work still owed and the next scheduled scan", () => {
    const lines = buildExecutiveSummary(base, fmt);
    expect(lines).toContain("2 of 3 personas reached the goal.");
    expect(lines).toContain("32 WCAG criteria need manual review (listed at the end).");
    expect(lines).toContain("Next scheduled scan: 2026-10-12.");
  });

  it("uses singular forms and no em dashes", () => {
    const lines = buildExecutiveSummary(
      {
        ...base,
        severityCounts: { critical: 1, serious: 0, moderate: 0, minor: 0 },
        locationCount: 1,
        fixFirstTitles: ["Buttons with no name"],
        manualReviewCount: 1,
        personaSuccess: null,
        nextScanAt: null,
      },
      fmt,
    );
    expect(lines[0]).toBe("Automated checks found 1 distinct issue on 1 page or state: 1 critical.");
    expect(lines).toContain("Fix first: Buttons with no name.");
    expect(lines).toContain("1 WCAG criterion needs manual review (listed at the end).");
    expect(lines.join(" ")).not.toContain("—");
  });
});


it("does not describe failed or unrecorded checks as a clean audit", () => {
  const input = { ...base, severityCounts: { critical: 0, serious: 0, moderate: 0, minor: 0 } };
  const scanCoverage = { checks: [{ url: "https://example.com/private", step: 2, status: "failed" as const, error: "axe timed out" }], executionFailures: [{ url: "https://example.com/start", error: "browser closed" }] };
  const lines = buildExecutiveSummary({ ...input, scanCoverage }, fmt).join("\n");
  expect(lines).toContain("Scan coverage incomplete");
  expect(lines).toContain("https://example.com/private");
  expect(lines).toContain("axe timed out");
  expect(lines).toContain("browser closed");
  expect(lines).not.toContain("found no violations");
  expect(buildExecutiveSummary({ ...input, scanCoverage: null }, fmt).join("\n")).toContain("Scan coverage was not recorded");
});


it("does not call missing prior findings fixed when comparison coverage is incomplete", () => {
  const summary = buildExecutiveSummary({ ...base, history: { previousDate: "2026-10-08", comparisonComplete: false, newCount: 1, fixedCount: 3, stillOpenCount: 2 } }, fmt).join("\n");
  expect(summary).toContain("Comparison incomplete");
  expect(summary).toContain("1 new, 2 still observed");
  expect(summary).not.toContain("3 fixed");
});
