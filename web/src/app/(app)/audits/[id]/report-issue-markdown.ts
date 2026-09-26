/**
 * Pure Markdown builder for the "Copy as issue" action on an evidence-wall finding.
 * No DOM, no clipboard — the button components (report-issue-copy.tsx,
 * report-issue-copy-all.tsx) own that side effect. Kept separate so the format is
 * unit-testable without rendering React.
 *
 * Deliberately does not fabricate a helpUrl: axe-core's helpUrl is not stored on the
 * findings row, so a caller either has one from elsewhere or omits it — never guessed
 * (no-invented-metrics honesty wall in web/DESIGN.md). The WCAG link is the one exception:
 * it is derived deterministically from the criterion's official title (see
 * `wcagUnderstandingUrl` below), the same slug pattern W3C uses for every Understanding
 * doc, so it is never a guess about content — only about a codified naming convention.
 */

import { criterionName } from "@/lib/wcag";

export interface IssueFindingInput {
  /** axe-core's "help" text — the human rule name (stored as the finding's title). */
  title: string;
  severity: string;
  ruleId?: string | null;
  /** WCAG success-criterion codes, e.g. ["1.4.3", "4.1.2"]. */
  wcagCodes?: string[];
  helpUrl?: string | null;
  /** States/URLs the defect was seen on. */
  locations?: string[];
  /** CSS selector for the affected element, when captured. */
  target?: string | null;
  recommendation?: string | null;
}

function severityLabel(severity: string): string {
  return severity ? severity.charAt(0).toUpperCase() + severity.slice(1) : "Unknown";
}

/**
 * The W3C "Understanding" doc for a WCAG success criterion is always
 * `.../Understanding/<slug-of-the-official-title>.html`. Derived from the criterion name
 * already carried in `src/lib/wcag.ts`, not invented — unknown codes (criterionName
 * returns null) simply produce no link, never a guessed one.
 */
export function wcagUnderstandingUrl(code: string): string | null {
  const name = criterionName(code);
  if (!name) return null;
  const slug = name
    .toLowerCase()
    .replace(/[(),]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `https://www.w3.org/WAI/WCAG22/Understanding/${slug}.html`;
}

export function buildIssueTitle(finding: IssueFindingInput): string {
  const codes = finding.wcagCodes?.length ? `, WCAG ${finding.wcagCodes.join(", ")}` : "";
  return `[a11y] ${finding.title} (${severityLabel(finding.severity)}${codes})`;
}

export function buildIssueBody(finding: IssueFindingInput): string {
  const lines: string[] = [];

  lines.push("**Where found**");
  if (finding.locations && finding.locations.length > 0) {
    for (const loc of finding.locations) lines.push(`- ${loc}`);
  } else {
    lines.push("- Not recorded");
  }
  lines.push("");

  if (finding.target) {
    lines.push("**Selector**", "", "```", finding.target, "```", "");
  }

  lines.push("**WCAG criterion**");
  if (finding.wcagCodes && finding.wcagCodes.length > 0) {
    for (const code of finding.wcagCodes) {
      const name = criterionName(code);
      const url = wcagUnderstandingUrl(code);
      const label = name ? `${code} ${name}` : code;
      lines.push(url ? `- [${label}](${url})` : `- ${label}`);
    }
  } else {
    lines.push("- Not recorded");
  }
  lines.push("");

  lines.push("**Rule**");
  lines.push(
    finding.ruleId ? `- axe-core rule: \`${finding.ruleId}\`` : "- axe-core rule: not recorded",
  );
  if (finding.helpUrl) lines.push(`- ${finding.helpUrl}`);
  lines.push("");

  if (finding.recommendation) {
    lines.push("**Suggested fix**", "", finding.recommendation, "");
  }

  lines.push("_Found by Personaudit (axe-core)_");
  return lines.join("\n");
}

/** Title + a blank line + body — what actually goes on the clipboard. */
export function buildIssueMarkdown(finding: IssueFindingInput): string {
  return `${buildIssueTitle(finding)}\n\n${buildIssueBody(finding)}`;
}

/**
 * "Copy all open findings" — one Markdown checklist, GitHub/Jira task-list syntax
 * (`- [ ]`), one line per finding with severity, title, WCAG codes, and the first
 * location, plus a link into the per-finding detail via an anchor-free plain summary
 * (the full per-finding body is what `buildIssueMarkdown` is for). Empty list still
 * produces valid Markdown with a note, never a blank string.
 */
export function buildIssueChecklist(findings: IssueFindingInput[]): string {
  const lines: string[] = ["## Open accessibility findings", ""];
  if (findings.length === 0) {
    lines.push("_No open findings._");
    return lines.join("\n");
  }
  for (const finding of findings) {
    const codes = finding.wcagCodes?.length ? `, WCAG ${finding.wcagCodes.join(", ")}` : "";
    const ruleId = finding.ruleId ? ` (\`${finding.ruleId}\`)` : "";
    const where = finding.locations?.[0] ? ` · found at ${finding.locations[0]}` : "";
    lines.push(`- [ ] **${severityLabel(finding.severity)}** ${finding.title}${ruleId}${codes}${where}`);
  }
  lines.push("", "_Found by Personaudit (axe-core)_");
  return lines.join("\n");
}
