import { AxeBuilder } from "@axe-core/playwright";
import type { Page } from "playwright";
import type { Finding } from "./engine.js";

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

export async function runAxeScan(page: Page): Promise<Finding[]> {
  try {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
      .analyze();

    return (results.violations as AxeViolation[]).map((violation) => ({
      severity: impactToSeverity[violation.impact ?? "minor"] ?? "minor",
      category: "accessibility" as const,
      title: violation.help,
      description: `${violation.description}. Affected elements: ${violation.nodes
        .slice(0, 3)
        .map((n) => n.target.join(" > "))
        .join("; ")}`,
      recommendation: `See ${violation.helpUrl} for remediation guidance.`,
      pageUrl: page.url(),
    }));
  } catch (error) {
    console.error(
      "axe-core scan failed:",
      error instanceof Error ? error.message : error
    );
    return [];
  }
}
