import type { Finding, AgentResult } from "../agent/engine.js";
import type { Persona } from "../personas/types.js";

/**
 * The report is the product. Two rules shape it:
 *
 * 1. Fact and opinion are never mixed. axe findings are deterministic and
 *    citable; persona findings are a model's judgement and are labelled as such.
 *    A buyer who cannot tell which is which cannot trust either.
 * 2. Every number means something. The old report led with a 0-100 score that
 *    was always 0 on real sites, and an issue count that multiplied by the
 *    number of personas hired (it claimed 30 issues where there were 14). Both
 *    are gone.
 */

interface PersonaReport {
  persona: Persona;
  agentResult: AgentResult;
}

function severityEmoji(s: Finding["severity"]): string {
  switch (s) {
    case "critical":
      return "🔴";
    case "serious":
      return "🟠";
    case "moderate":
      return "🟡";
    case "minor":
      return "🔵";
    default:
      return "⚪";
  }
}

const SEVERITY_ORDER: Finding["severity"][] = ["critical", "serious", "moderate", "minor"];

function severityRank(s: Finding["severity"]): number {
  const i = SEVERITY_ORDER.indexOf(s);
  return i === -1 ? SEVERITY_ORDER.length : i;
}

function bySeverity(a: Finding, b: Finding): number {
  return severityRank(a.severity) - severityRank(b.severity);
}

/** Only reads `severity`, so it serves both raw findings and rule groups. */
type HasSeverity = { severity: Finding["severity"] };

function countBySeverity(findings: HasSeverity[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of findings) counts[f.severity ?? "minor"] = (counts[f.severity ?? "minor"] ?? 0) + 1;
  return counts;
}

function severityLine(findings: HasSeverity[]): string {
  const counts = countBySeverity(findings);
  const parts = SEVERITY_ORDER.filter((s) => counts[s]).map((s) => `${counts[s]} ${s}`);
  return parts.length ? parts.join(", ") : "none";
}

/** Dedupe a persona's own findings. Same title on the same page is one issue. */
function deduplicateFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.title}|${f.pageUrl}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function shortPath(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + (u.search ? u.search.slice(0, 40) : "");
  } catch {
    return url ?? "";
  }
}

/**
 * One entry per axe rule, listing the elements it matched.
 *
 * Reporting one row per element is technically accurate and practically
 * useless: a real run produced 85 rows covering 16 actual problems, 27 of them
 * the same contrast rule. A developer fixes a rule, usually in one component,
 * not 27 unrelated things. So the headline count is rules, and elements are the
 * detail underneath.
 */
export interface AxeRuleGroup {
  ruleId: string;
  title: string;
  severity: Finding["severity"];
  description: string;
  recommendation: string;
  elements: Finding[];
  seenOn: string[];
}

export function groupAxeByRule(findings: Finding[]): AxeRuleGroup[] {
  const groups = new Map<string, AxeRuleGroup>();

  for (const f of findings) {
    const key = f.ruleId ?? f.title ?? "unknown";
    let g = groups.get(key);
    if (!g) {
      g = {
        ruleId: key,
        title: f.title ?? "(untitled)",
        severity: f.severity ?? "minor",
        description: f.description ?? "",
        recommendation: f.recommendation ?? "",
        elements: [],
        seenOn: [],
      };
      groups.set(key, g);
    }
    g.elements.push(f);
    for (const url of f.seenOn ?? (f.pageUrl ? [f.pageUrl] : [])) {
      if (!g.seenOn.includes(url)) g.seenOn.push(url);
    }
  }

  return [...groups.values()].sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity) || b.elements.length - a.elements.length,
  );
}

const MAX_ELEMENTS_SHOWN = 5;

function renderAxeSection(axeFindings: Finding[]): string {
  const lines: string[] = [];
  const groups = groupAxeByRule(axeFindings);

  lines.push("## Accessibility defects");
  lines.push("");
  lines.push(
    "Found by axe-core in every state reached — not just the entry page. These are rule violations, not opinions: each names the rule, the element, and where it appeared.",
  );
  lines.push("");

  if (groups.length === 0) {
    lines.push("*No axe-core violations in any state reached.*");
    lines.push("");
    return lines.join("\n");
  }

  lines.push(`**${groups.length} defects** across ${axeFindings.length} elements.`);
  lines.push("");

  for (const g of groups) {
    lines.push(`${severityEmoji(g.severity)} **[${String(g.severity).toUpperCase()}]** ${g.title}`);
    lines.push(`> Rule: \`${g.ruleId}\` · ${g.elements.length} element${g.elements.length === 1 ? "" : "s"}`);
    lines.push(`> ${g.description}`);
    lines.push(`> **Fix:** ${g.recommendation}`);

    for (const el of g.elements.slice(0, MAX_ELEMENTS_SHOWN)) {
      lines.push(`> - \`${el.target ?? "?"}\``);
    }
    if (g.elements.length > MAX_ELEMENTS_SHOWN) {
      lines.push(`> - …and ${g.elements.length - MAX_ELEMENTS_SHOWN} more`);
    }

    // One component broken in five states is one fix; listing the states is how
    // you confirm the fix landed everywhere.
    if (g.seenOn.length > 0) {
      lines.push(
        `> Seen in ${g.seenOn.length} state${g.seenOn.length === 1 ? "" : "s"}: ${g.seenOn.slice(0, 5).map((u) => `\`${shortPath(u)}\``).join(", ")}${g.seenOn.length > 5 ? ", …" : ""}`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

function renderPersonaSection(report: PersonaReport): string {
  const { persona, agentResult } = report;
  const findings = deduplicateFindings(agentResult.findings).sort(bySeverity);

  const lines: string[] = [];
  lines.push(`### ${persona.name} — ${persona.description}`);
  lines.push("");
  lines.push(`**Goal:** ${agentResult.goalCompleted ? "achieved ✅" : "not achieved ❌"}`);
  lines.push("");
  lines.push(`| Steps | States reached | UX observations |`);
  lines.push(`|-------|----------------|-----------------|`);
  lines.push(
    `| ${agentResult.totalSteps}/${persona.maxSteps} | ${agentResult.pagesVisited.length} | ${findings.length} |`,
  );
  lines.push("");

  if (findings.length > 0) {
    lines.push("#### What they ran into");
    lines.push("");
    for (const f of findings) {
      lines.push(`${severityEmoji(f.severity)} **[${String(f.severity).toUpperCase()}]** ${f.title ?? "(untitled finding)"}`);
      lines.push(`> ${f.description ?? ""}`);
      lines.push(`> **Suggested fix:** ${f.recommendation ?? ""}`);
      lines.push(`> Page: ${f.pageUrl ?? ""}`);
      lines.push("");
    }
  } else {
    lines.push("*Nothing got in their way.*");
    lines.push("");
  }

  if (agentResult.steps.length > 0) {
    lines.push("<details><summary>Session steps</summary>");
    lines.push("");
    lines.push("| # | Action | Detail | Page |");
    lines.push("|---|--------|--------|------|");
    for (const step of agentResult.steps.slice(0, 30)) {
      // Defensive: renders model-shaped data at the end of an expensive run. A
      // missing field must degrade the table, never throw the run away.
      const detail = step.detail ?? "";
      const shortDetail = detail.length > 50 ? detail.slice(0, 50) + "..." : detail;
      lines.push(`| ${step.step} | ${step.action} | ${shortDetail} | ${shortPath(step.pageUrl)} |`);
    }
    if (agentResult.steps.length > 30) {
      lines.push(`| ... | ${agentResult.steps.length - 30} more steps | | |`);
    }
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }

  return lines.join("\n");
}

export function generateMarkdownReport(
  url: string,
  reports: PersonaReport[],
  axeFindings: Finding[] = [],
): string {
  const achieved = reports.filter((r) => r.agentResult.goalCompleted).length;
  const uxFindings = reports.flatMap((r) => deduplicateFindings(r.agentResult.findings));
  const axeGroups = groupAxeByRule(axeFindings);

  // Distinct states, across everyone. This is what the personas bought you, and
  // it is the number to compare against what a crawler can see.
  const states = new Set(reports.flatMap((r) => r.agentResult.pagesVisited));

  const lines: string[] = [];

  lines.push("# MultiPersonas Report");
  lines.push("");
  lines.push(`**Site:** ${url}`);
  lines.push(`**Date:** ${new Date().toISOString().split("T")[0]}`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push(`| Task success | States reached | Accessibility defects | UX observations |`);
  lines.push(`|:---:|:---:|:---:|:---:|`);
  lines.push(
    `| **${achieved}/${reports.length} personas** | ${states.size} | ${axeGroups.length} | ${uxFindings.length} |`,
  );
  lines.push("");
  lines.push(`- **Accessibility defects** (${severityLine(axeGroups)}) — axe-core rule violations across ${axeFindings.length} elements. Deterministic.`);
  lines.push(`- **UX observations** (${severityLine(uxFindings)}) — what the personas reported. AI judgement; treat as a lead to check, not a verdict.`);
  lines.push("");

  if (reports.length > 0 && achieved === 0) {
    lines.push(`> **No persona finished what they came to do.** Their goals and what stopped them are below.`);
    lines.push("");
  }

  lines.push("| Persona | Goal | Steps | States | UX observations |");
  lines.push("|---------|:---:|:---:|:---:|:---:|");
  for (const r of reports) {
    const n = deduplicateFindings(r.agentResult.findings).length;
    lines.push(
      `| ${r.persona.name} (${r.persona.id}) | ${r.agentResult.goalCompleted ? "✅" : "❌"} | ${r.agentResult.totalSteps} | ${r.agentResult.pagesVisited.length} | ${n} |`,
    );
  }
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push(renderAxeSection(axeFindings));
  lines.push("---");
  lines.push("");

  lines.push("## What each persona experienced");
  lines.push("");
  for (const r of reports) {
    lines.push(renderPersonaSection(r));
    lines.push("---");
    lines.push("");
  }

  lines.push(
    "*Generated by [MultiPersonas](https://github.com/multipersonas). Accessibility defects are axe-core rule violations. UX observations are AI judgement.*",
  );

  return lines.join("\n");
}

/**
 * Report for a crawl-only scan: deterministic accessibility coverage, no
 * personas. This is the product's evidence-backed core (run 4). Every number
 * here is an axe rule violation — no AI judgement, nothing to caveat.
 */
export function generateScanReport(
  url: string,
  axeFindings: Finding[],
  pagesVisited: string[],
  skipped: string[] = [],
): string {
  const groups = groupAxeByRule(axeFindings);
  const lines: string[] = [];

  lines.push("# Accessibility Scan");
  lines.push("");
  lines.push(`**Site:** ${url}`);
  lines.push(`**Date:** ${new Date().toISOString().split("T")[0]}`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push(`| States scanned | Accessibility defects | Affected elements |`);
  lines.push(`|:---:|:---:|:---:|`);
  lines.push(`| ${pagesVisited.length} | **${groups.length}** | ${axeFindings.length} |`);
  lines.push("");
  lines.push(`Severity: ${severityLine(groups)}.`);
  if (skipped.length > 0) {
    // Never let a budget cap read as "clean". Say what was not scanned.
    lines.push("");
    lines.push(`> Page budget reached. ${skipped.length} more states were found but not scanned; raise \`--max-pages\` to cover them.`);
  }
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push(renderAxeSection(axeFindings));

  lines.push("---");
  lines.push("");
  lines.push("<details><summary>States scanned</summary>");
  lines.push("");
  for (const p of pagesVisited) lines.push(`- \`${shortPath(p)}\``);
  lines.push("");
  lines.push("</details>");
  lines.push("");
  lines.push("*Generated by [MultiPersonas](https://github.com/multipersonas). All findings are axe-core rule violations.*");

  return lines.join("\n");
}

export type { PersonaReport };
