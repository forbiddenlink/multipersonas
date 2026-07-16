import { AxeBuilder } from "@axe-core/playwright";
import type { Page } from "playwright";
import type { Finding } from "./engine.js";
import { defectKey } from "./defect-key.js";

/**
 * Deterministic accessibility scanning.
 *
 * This is the part of the report that is fact rather than opinion, so it carries
 * the product. The personas' job is to *reach* states; axe's job is to judge
 * them. Until 2026-07-16 the second half did not happen: axe ran once, on the
 * entry URL, before any persona started. We reached ten authenticated states and
 * scanned the login page — exactly what a free tool already does.
 *
 * Scans are now keyed by (rule, element) rather than by page. A broken link in a
 * nav bar is one defect in one component, not ten defects because it appears on
 * ten pages. `seenOn` records where it showed up, so the fix can be verified.
 */

interface AxeViolation {
  id: string;
  impact: "critical" | "serious" | "moderate" | "minor" | null;
  description: string;
  help: string;
  helpUrl: string;
  nodes: { html: string; target: string[] }[];
}

const impactToSeverity: Record<string, Finding["severity"]> = {
  critical: "critical",
  serious: "serious",
  moderate: "moderate",
  minor: "minor",
};

/**
 * Cap per violation. A single rule can match hundreds of nodes on a data-dense
 * page; the first few make the point and the rest are the same fix.
 */
const MAX_NODES_PER_VIOLATION = 5;

/** Scan whatever state the page is currently in. */
export async function runAxeScan(page: Page): Promise<Finding[]> {
  try {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
      .analyze();

    const url = page.url();
    return (results.violations as AxeViolation[]).flatMap((violation) =>
      violation.nodes.slice(0, MAX_NODES_PER_VIOLATION).map((node) => ({
        severity: impactToSeverity[violation.impact ?? "minor"] ?? "minor",
        category: "accessibility" as const,
        title: violation.help,
        description: violation.description,
        recommendation: `See ${violation.helpUrl} for remediation guidance.`,
        pageUrl: url,
        ruleId: violation.id,
        target: node.target.join(" > "),
        html: node.html.slice(0, 200),
        seenOn: [url],
      })),
    );
  } catch (error) {
    console.error(
      "axe-core scan failed:",
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

/**
 * Collapse the same defect seen across many states into one finding.
 *
 * Without this, scanning every state turns one nav-bar defect into one finding
 * per page visited, and the issue count measures how far the personas walked
 * rather than how broken the site is.
 */
export function mergeAxeFindings(findings: Finding[]): Finding[] {
  const byDefect = new Map<string, Finding>();

  for (const f of findings) {
    // Keyed on the normalized selector, so a component with a per-render random
    // id (Mantine, Emotion, React useId) is one defect across states rather than
    // a new one each time it renders. See defect-key.ts.
    const key = defectKey(f);
    const existing = byDefect.get(key);

    if (!existing) {
      byDefect.set(key, { ...f, seenOn: [...(f.seenOn ?? [f.pageUrl])] });
      continue;
    }

    for (const url of f.seenOn ?? [f.pageUrl]) {
      if (!existing.seenOn!.includes(url)) existing.seenOn!.push(url);
    }
  }

  return [...byDefect.values()];
}
