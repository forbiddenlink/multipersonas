import type { Finding, AgentResult } from "../agent/engine.js";
import type { Persona } from "../personas/types.js";

interface PersonaReport {
  persona: Persona;
  agentResult: AgentResult;
  axeFindings: Finding[];
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
  }
}

function severityRank(s: Finding["severity"]): number {
  switch (s) {
    case "critical":
      return 0;
    case "serious":
      return 1;
    case "moderate":
      return 2;
    case "minor":
      return 3;
  }
}

function deduplicateFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.title}|${f.pageUrl}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function computeScore(findings: Finding[], goalCompleted: boolean): number {
  let score = 100;
  for (const f of findings) {
    switch (f.severity) {
      case "critical":
        score -= 20;
        break;
      case "serious":
        score -= 10;
        break;
      case "moderate":
        score -= 5;
        break;
      case "minor":
        score -= 2;
        break;
    }
  }
  if (!goalCompleted) score -= 15;
  return Math.max(0, Math.min(100, score));
}

function renderPersonaSection(report: PersonaReport): string {
  const { persona, agentResult, axeFindings } = report;
  const allFindings = deduplicateFindings([
    ...agentResult.findings,
    ...axeFindings,
  ]).sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  const score = computeScore(allFindings, agentResult.goalCompleted);

  const lines: string[] = [];
  lines.push(`### ${persona.name} — ${persona.description}`);
  lines.push("");
  lines.push(
    `| Score | Steps | Pages | Goal | Findings |`
  );
  lines.push(`|-------|-------|-------|------|----------|`);
  lines.push(
    `| **${score}/100** | ${agentResult.totalSteps}/${persona.maxSteps} | ${agentResult.pagesVisited.length} | ${agentResult.goalCompleted ? "Achieved" : "Blocked"} | ${allFindings.length} |`
  );
  lines.push("");

  if (allFindings.length > 0) {
    lines.push("#### Issues Found");
    lines.push("");
    for (const f of allFindings) {
      // Second layer of defence. The engine validates findings at the boundary
      // now, but this renderer runs at the end of an expensive job and must
      // never be the thing that loses it.
      const severity = f.severity ?? "minor";
      lines.push(
        `${severityEmoji(severity)} **[${String(severity).toUpperCase()}]** ${f.title ?? "(untitled finding)"}`
      );
      lines.push(`> ${f.description ?? ""}`);
      lines.push(`> **Fix:** ${f.recommendation ?? ""}`);
      lines.push(`> Page: ${f.pageUrl ?? ""}`);
      lines.push("");
    }
  } else {
    lines.push("*No issues found. The site performed well for this persona.*");
    lines.push("");
  }

  if (agentResult.steps.length > 0) {
    lines.push("#### Session Steps");
    lines.push("");
    lines.push("| # | Action | Detail | Page |");
    lines.push("|---|--------|--------|------|");
    for (const step of agentResult.steps.slice(0, 20)) {
      // Defensive: this renders model-shaped data at the very end of an
      // expensive run. A missing field must degrade the table, never throw away
      // 100+ model calls. (It did exactly that on 2026-07-15 when a
      // mark_goal_complete arrived with no summary.)
      const detail = step.detail ?? "";
      const shortDetail = detail.length > 50 ? detail.slice(0, 50) + "..." : detail;
      let shortUrl: string;
      try {
        shortUrl = new URL(step.pageUrl).pathname;
      } catch {
        shortUrl = step.pageUrl ?? "";
      }
      lines.push(
        `| ${step.step} | ${step.action} | ${shortDetail} | ${shortUrl} |`
      );
    }
    if (agentResult.steps.length > 20) {
      lines.push(`| ... | ${agentResult.steps.length - 20} more steps | | |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function generateMarkdownReport(
  url: string,
  reports: PersonaReport[]
): string {
  const allFindings = reports.flatMap((r) =>
    deduplicateFindings([...r.agentResult.findings, ...r.axeFindings])
  );
  const overallScore = Math.round(
    reports.reduce((sum, r) => {
      const findings = deduplicateFindings([
        ...r.agentResult.findings,
        ...r.axeFindings,
      ]);
      return sum + computeScore(findings, r.agentResult.goalCompleted);
    }, 0) / reports.length
  );

  const criticalCount = allFindings.filter(
    (f) => f.severity === "critical"
  ).length;
  const seriousCount = allFindings.filter(
    (f) => f.severity === "serious"
  ).length;

  const lines: string[] = [];

  // Header
  lines.push("# MultiPersonas Test Report");
  lines.push("");
  lines.push(`**URL:** ${url}`);
  lines.push(`**Date:** ${new Date().toISOString().split("T")[0]}`);
  lines.push(`**Personas tested:** ${reports.length}`);
  lines.push("");

  // Summary
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Overall Score | Total Issues | Critical | Serious | Personas Tested |`);
  lines.push(`|:---:|:---:|:---:|:---:|:---:|`);
  lines.push(
    `| **${overallScore}/100** | ${allFindings.length} | ${criticalCount} | ${seriousCount} | ${reports.length} |`
  );
  lines.push("");

  // Per-persona breakdown
  lines.push("## Persona Results");
  lines.push("");
  lines.push("| Persona | Score | Goal | Findings |");
  lines.push("|---------|:---:|:---:|:---:|");
  for (const r of reports) {
    const findings = deduplicateFindings([
      ...r.agentResult.findings,
      ...r.axeFindings,
    ]);
    const score = computeScore(findings, r.agentResult.goalCompleted);
    lines.push(
      `| ${r.persona.name} (${r.persona.id}) | ${score}/100 | ${r.agentResult.goalCompleted ? "✅" : "❌"} | ${findings.length} |`
    );
  }
  lines.push("");

  // Detailed per-persona sections
  lines.push("---");
  lines.push("");
  for (const r of reports) {
    lines.push(renderPersonaSection(r));
    lines.push("---");
    lines.push("");
  }

  // Footer
  lines.push(
    "*Generated by [MultiPersonas](https://github.com/multipersonas) — AI persona-based website testing*"
  );

  return lines.join("\n");
}

export type { PersonaReport };
