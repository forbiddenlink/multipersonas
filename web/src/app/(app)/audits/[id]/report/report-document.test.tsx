// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { assembleReport, type FindingRow } from "@/lib/report";
import { AXE_CORE_VERSION, WCAG_VERSION } from "@/lib/scan-engine";
import { ReportDocument } from "./report-document";

const run = {
  id: "11111111-2222-3333-4444-555555555555",
  url: "https://client.example",
  created_at: "2026-10-09T12:00:00Z",
  persona_ids: [],
  scan_coverage: {
    checks: [
      { url: "https://client.example/", step: 0, status: "scanned" },
      { url: "https://client.example/cart", step: 1, status: "scanned" },
    ],
    executionFailures: [],
  },
};

const finding: FindingRow = {
  id: "f1",
  source: "axe",
  severity: "serious",
  title: "Elements must have sufficient color contrast",
  description: "d",
  recommendation: "r",
  rule_id: "color-contrast",
  wcag_tags: ["wcag2aa", "wcag143"],
  page_url: "https://client.example/cart",
};

function html(branding: { clientName?: string | null; agencyName?: string | null } = {}): string {
  return renderToStaticMarkup(
    <ReportDocument report={assembleReport(run, [finding], [], branding)} regression={null} schedule={null} />,
  );
}

describe("ReportDocument scope block", () => {
  it("states the date, URL set, axe-core version, WCAG version and the manual-review limit", () => {
    const out = html();
    expect(out).toContain("Scope of this report");
    expect(out).toContain("October 9, 2026");
    expect(out).toContain("https://client.example/cart");
    expect(out).toContain(`axe-core ${AXE_CORE_VERSION}`);
    expect(out).toContain(`WCAG ${WCAG_VERSION}`);
    expect(out).toContain("Automated checks only; manual review is still required.");
  });

  it("never claims compliance and carries no em dash", () => {
    const out = html({ agencyName: "Northwind Studio", clientName: "Client Co" });
    expect(out).not.toMatch(/compliant|compliance (verdict|report)|proves compliance/i);
    expect(out).not.toContain("—");
  });

  it("puts the agency name in the running page header, escaped", () => {
    expect(html({ agencyName: "Northwind Studio" })).toContain("--report-running-title:\"Northwind Studio accessibility report");
    const hostile = html({ agencyName: 'x"}</style><script>1</script>' });
    expect(hostile).not.toContain("<script>");
  });
});
