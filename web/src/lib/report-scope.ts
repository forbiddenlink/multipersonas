import type { ScanCoverage } from "./scan-coverage";
import { AXE_CORE_VERSION, WCAG_VERSION } from "./scan-engine";

/** URLs listed on the printed scope block before the rest collapse into a count. */
export const SCOPE_URL_LIMIT = 12;

/** The line every report and every export carries about what automated checks can show. */
export const SCOPE_STATEMENT = "Automated checks only; manual review is still required.";

export interface ReportScope {
  auditDate: string;
  /** Distinct URLs the engine checked, in the order it reached them. */
  urls: string[];
  /** URLs checked beyond SCOPE_URL_LIMIT, not listed. */
  moreUrls: number;
  axeVersion: string;
  wcagVersion: string;
  statement: string;
}

/**
 * What a reader needs to know about the extent of a report. The URL set comes from the
 * scan coverage (pages the engine really checked), not from the findings: a clean page
 * has no findings but is still in scope. A failed check is not in scope here, because the
 * coverage section already lists it as a failure. With no coverage recorded the only URL
 * we can stand behind is the one the audit was started on.
 */
export function buildReportScope(report: {
  url: string;
  auditDate: string;
  scanCoverage: ScanCoverage | null;
}): ReportScope {
  const checked = report.scanCoverage?.checks
    .filter((check) => check.status === "scanned")
    .map((check) => check.url) ?? [];
  const urls = [...new Set(checked.length > 0 ? checked : [report.url])];
  return {
    auditDate: report.auditDate,
    urls: urls.slice(0, SCOPE_URL_LIMIT),
    moreUrls: Math.max(0, urls.length - SCOPE_URL_LIMIT),
    axeVersion: AXE_CORE_VERSION,
    wcagVersion: WCAG_VERSION,
    statement: SCOPE_STATEMENT,
  };
}

/**
 * The text the printed page header shows on every page. It reaches the page through CSS
 * custom properties because @page margin boxes cannot read document text. The agency
 * name is user-entered, so every character outside a conservative allowlist is dropped
 * before it lands inside a CSS string: no quote, backslash, angle bracket or newline can
 * get through to close the string or the style element.
 */
export function runningHeaderCss(title: string, date: string): string {
  const safe = (value: string): string =>
    value.replace(/[^\p{L}\p{N} .,:;/_@?=&%#+()'-]/gu, "").slice(0, 90);
  return `:root{--report-running-title:"${safe(title)}";--report-running-date:"${safe(date)}"}`;
}
