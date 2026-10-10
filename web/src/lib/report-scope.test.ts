import { describe, expect, it } from "vitest";
import { buildReportScope, runningHeaderCss, SCOPE_STATEMENT, SCOPE_URL_LIMIT } from "./report-scope";
import { AXE_CORE_VERSION, WCAG_VERSION } from "./scan-engine";

const base = { url: "https://client.example", auditDate: "2026-07-28T12:00:00Z" };
const check = (url: string, status: "scanned" | "failed" = "scanned", step = 0) => ({ url, step, status });

describe("buildReportScope", () => {
  it("lists the pages the engine checked, once each, in the order reached", () => {
    const scope = buildReportScope({
      ...base,
      scanCoverage: {
        checks: [check("https://client.example/"), check("https://client.example/cart", "scanned", 1), check("https://client.example/", "scanned", 2)],
        executionFailures: [],
      },
    });
    expect(scope.urls).toEqual(["https://client.example/", "https://client.example/cart"]);
    expect(scope.moreUrls).toBe(0);
  });

  it("leaves failed checks out of the scope", () => {
    const scope = buildReportScope({
      ...base,
      scanCoverage: { checks: [check("https://client.example/a"), check("https://client.example/b", "failed")], executionFailures: [] },
    });
    expect(scope.urls).toEqual(["https://client.example/a"]);
  });

  it("falls back to the audited URL when no coverage was recorded", () => {
    expect(buildReportScope({ ...base, scanCoverage: null }).urls).toEqual(["https://client.example"]);
    expect(
      buildReportScope({ ...base, scanCoverage: { checks: [check("https://client.example/x", "failed")], executionFailures: [] } }).urls,
    ).toEqual(["https://client.example"]);
  });

  it("caps the list and counts the rest", () => {
    const checks = Array.from({ length: SCOPE_URL_LIMIT + 5 }, (_, i) => check(`https://client.example/p${i}`, "scanned", i));
    const scope = buildReportScope({ ...base, scanCoverage: { checks, executionFailures: [] } });
    expect(scope.urls).toHaveLength(SCOPE_URL_LIMIT);
    expect(scope.moreUrls).toBe(5);
  });

  it("carries the engine versions and the manual-review statement", () => {
    const scope = buildReportScope({ ...base, scanCoverage: null });
    expect(scope.axeVersion).toBe(AXE_CORE_VERSION);
    expect(scope.wcagVersion).toBe(WCAG_VERSION);
    expect(scope.statement).toBe(SCOPE_STATEMENT);
    expect(SCOPE_STATEMENT).toBe("Automated checks only; manual review is still required.");
  });
});

describe("runningHeaderCss", () => {
  it("keeps plain titles intact", () => {
    expect(runningHeaderCss("Northwind Studio accessibility report", "October 9, 2026")).toBe(
      ':root{--report-running-title:"Northwind Studio accessibility report";--report-running-date:"October 9, 2026"}',
    );
  });

  it("cannot be broken out of the CSS string or the style element", () => {
    const css = runningHeaderCss('x"}</style><script>alert(1)</script>\\\n{', "d");
    const title = css.match(/--report-running-title:"([^]*?)";--report-running-date/)![1]!;
    expect(title).not.toMatch(/["\\<>{}\n]/);
    expect(css).not.toContain("</style");
  });

  it("caps the length", () => {
    const title = runningHeaderCss("a".repeat(500), "d").match(/title:"(a*)"/)![1]!;
    expect(title).toHaveLength(90);
  });
});
