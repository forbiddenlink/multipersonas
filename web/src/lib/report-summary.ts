import type { Severity } from "@/lib/report";

/**
 * The plain-language executive summary at the top of an exported report: the part a
 * client reads when they read nothing else. Pure so its wording can be tested. Every
 * sentence restates a number already in the report; nothing here is a conformance claim.
 */
export interface ExecutiveSummaryInput {
  severityCounts: Record<Severity, number>;
  /** Distinct pages or states with at least one finding. */
  locationCount: number;
  /** Fix-first titles, highest priority first. */
  fixFirstTitles: string[];
  /** Null when the run is not part of a project, so there is nothing to compare. */
  history: {
    /** Null on the first scan of the project. */
    previousDate: string | null;
    newCount: number;
    fixedCount: number;
    stillOpenCount: number;
  } | null;
  personaSuccess: { reached: number; total: number } | null;
  manualReviewCount: number;
  nextScanAt: string | null;
}

const ORDER: Severity[] = ["critical", "serious", "moderate", "minor"];

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}


export function buildExecutiveSummary(
  input: ExecutiveSummaryInput,
  formatDate: (iso: string) => string,
): string[] {
  const lines: string[] = [];
  const total = ORDER.reduce((sum, sev) => sum + input.severityCounts[sev], 0);
  const where = count(input.locationCount, "page or state", "pages or states");

  if (total === 0) {
    lines.push(`Automated checks found no violations on the ${where} this audit reached.`);
  } else {
    const bySeverity = ORDER.filter((sev) => input.severityCounts[sev] > 0)
      .map((sev) => `${input.severityCounts[sev]} ${sev}`)
      .join(", ");
    lines.push(`Automated checks found ${count(total, "distinct issue", "distinct issues")} on ${where}: ${bySeverity}.`);
  }

  // Titles are a mix of noun phrases and sentences, so list them rather than weave
  // them into a sentence.
  const first = input.fixFirstTitles.slice(0, 3);
  if (total > 0 && first.length > 0) lines.push(`Fix first: ${first.join("; ")}.`);

  if (input.history) {
    if (input.history.previousDate === null) {
      lines.push("This is the first scan of this site. Later scans are compared against it.");
    } else {
      const h = input.history;
      lines.push(
        `Since the previous scan on ${formatDate(h.previousDate!)}: ${h.newCount} new, ${h.fixedCount} fixed, ${h.stillOpenCount} still open.`,
      );
    }
  }

  if (input.personaSuccess && input.personaSuccess.total > 0) {
    const { reached, total: personas } = input.personaSuccess;
    lines.push(`${reached} of ${personas} ${personas === 1 ? "persona" : "personas"} reached the goal.`);
  }

  if (input.manualReviewCount > 0) {
    lines.push(
      input.manualReviewCount === 1
        ? "1 WCAG criterion cannot be checked automatically. A person needs to review it (listed at the end)."
        : `${input.manualReviewCount} WCAG criteria cannot be checked automatically. A person needs to review them (listed at the end).`,
    );
  }

  if (input.nextScanAt) lines.push(`Next scheduled scan: ${formatDate(input.nextScanAt)}.`);
  return lines;
}
