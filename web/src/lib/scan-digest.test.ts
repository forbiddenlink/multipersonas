import { describe, expect, it } from "vitest";
import { buildScanDigest, type ScanDigestInput } from "./scan-digest";

const base: ScanDigestInput = {
  projectName: "Acme Store",
  siteUrl: "https://acme.example",
  projectUrl: "https://personaudit.com/projects/p1",
  runUrl: "https://personaudit.com/audits/r1",
  outcome: "completed",
  regression: {
    isFirstScan: false,
    newDefects: [
      { title: "Images must have alternate text", severity: "critical", pageUrl: "https://acme.example/cart" },
    ],
    cleared: [
      { title: "Buttons must have discernible text", severity: "serious" },
      { title: "Form elements must have labels", severity: "critical" },
    ],
    unchangedCount: 4,
  },
  taskSuccess: { achieved: 2, total: 3 },
};

function allText(input: ScanDigestInput): string {
  const d = buildScanDigest(input);
  return `${d.subject}\n${d.text}\n${d.html}`;
}

describe("buildScanDigest", () => {
  it("leads the subject with the change counts", () => {
    expect(buildScanDigest(base).subject).toBe("Acme Store: 1 new issue, 2 fixed");
  });

  it("says nothing changed when the scan matched the last one", () => {
    const d = buildScanDigest({
      ...base,
      regression: { isFirstScan: false, newDefects: [], cleared: [], unchangedCount: 4 },
    });
    expect(d.subject).toBe("Acme Store: no change since the last scan");
  });

  it("names the first scan instead of claiming a comparison", () => {
    const d = buildScanDigest({
      ...base,
      regression: { isFirstScan: true, newDefects: [], cleared: [], unchangedCount: 0 },
    });
    expect(d.subject).toBe("Acme Store: first scheduled scan finished");
    expect(d.text).not.toMatch(/fixed since/i);
  });

  it("reports a failed scan without inventing findings", () => {
    const d = buildScanDigest({ ...base, outcome: "failed", regression: null, runUrl: null });
    expect(d.subject).toBe("Acme Store: scheduled scan did not finish");
    expect(d.text).toContain(base.projectUrl);
    expect(d.text).not.toMatch(/new issue|fixed/i);
  });

  it("lists new and fixed issues with their page and links to the run", () => {
    const d = buildScanDigest(base);
    expect(d.text).toContain("Images must have alternate text");
    expect(d.text).toContain("https://acme.example/cart");
    expect(d.text).toContain("Form elements must have labels");
    expect(d.text).toContain("4 issues unchanged");
    expect(d.text).toContain(base.runUrl!);
    expect(d.html).toContain(`href="${base.runUrl}"`);
  });

  it("reports task success as observed counts", () => {
    expect(buildScanDigest(base).text).toContain("2 of 3 tasks completed");
  });

  it("caps long lists and says how many were left out", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      title: `Rule ${i}`,
      severity: "minor" as const,
      pageUrl: "https://acme.example/",
    }));
    const d = buildScanDigest({
      ...base,
      regression: { isFirstScan: false, newDefects: many, cleared: [], unchangedCount: 0 },
    });
    expect(d.text).toContain("Rule 4");
    expect(d.text).not.toContain("Rule 5");
    expect(d.text).toContain("and 3 more");
  });

  it("escapes site-controlled text in the HTML body", () => {
    const d = buildScanDigest({
      ...base,
      projectName: "<script>alert(1)</script>",
      regression: {
        isFirstScan: false,
        newDefects: [{ title: 'x" onmouseover="y', severity: "minor", pageUrl: "https://a.example/<b>" }],
        cleared: [],
        unchangedCount: 0,
      },
    });
    expect(d.html).not.toContain("<script>");
    expect(d.html).not.toContain('" onmouseover="');
    expect(d.html).not.toContain("<b>");
  });

  it("keeps a scan honest: no compliance claims, no em dashes, an opt-out", () => {
    for (const input of [base, { ...base, outcome: "failed" as const, regression: null }]) {
      const all = allText(input);
      expect(all).not.toMatch(/\bcompliant\b|compliance verdict|certif/i);
      expect(all).not.toContain("—");
      expect(all).toMatch(/not a compliance statement/i);
      expect(all).toMatch(/turn off these emails/i);
    }
  });
});
