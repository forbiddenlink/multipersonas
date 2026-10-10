import type { GradeReport } from "@engine/grader/score";

/** "2026-10-10 14:32 UTC": fixed timezone so the sheet reads the same for everyone. */
export function scannedAtUtc(createdAt: string): string {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "unknown time";
  return `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

/** Pages evaluated against the page limit, e.g. "7 of 10". Older reports carry no limit. */
export function pagesReached(report: Pick<GradeReport, "pagesScanned" | "coverage">): string {
  return report.coverage
    ? `${report.pagesScanned} of ${report.coverage.pageLimit}`
    : String(report.pagesScanned);
}

export type OutcomeTone = "fail" | "pass" | "note";

/**
 * One line of the cover sheet's outcome list. `glyph` is decorative: every outcome is
 * stated in `label`, so state never rests on the glyph or its colour alone.
 */
export type Outcome = {
  id: "wcag" | "best-practice" | "manual" | "untested";
  glyph: string;
  tone: OutcomeTone;
  label: string;
};

function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

export function gradeOutcomes(report: GradeReport): Outcome[] {
  const wcagRules = (report.rules ?? []).filter((r) => r.wcagAA).length;
  const bestPractice = report.totalViolations - report.wcagAAViolations;

  const wcag: Outcome =
    report.wcagAAViolations === 0
      ? { id: "wcag", glyph: "✓", tone: "pass", label: "No WCAG A/AA failures detected on the pages reached" }
      : {
          id: "wcag",
          glyph: "■",
          tone: "fail",
          label:
            wcagRules > 0
              ? `${count(wcagRules, "WCAG A/AA rule")} failed on ${count(report.wcagAAViolations, "element")}`
              : `${count(report.wcagAAViolations, "element")} fail a WCAG A/AA rule`,
        };

  const best: Outcome =
    bestPractice > 0
      ? {
          id: "best-practice",
          glyph: "●",
          tone: "note",
          label: `${count(bestPractice, "best-practice issue")}, listed but not graded`,
        }
      : { id: "best-practice", glyph: "✓", tone: "pass", label: "No best-practice issues flagged" };

  const manual: Outcome =
    report.needsReview === undefined
      ? { id: "manual", glyph: "?", tone: "note", label: "Manual-check count not recorded for this older grade" }
      : report.needsReview === 0
        ? { id: "manual", glyph: "◇", tone: "note", label: "No elements flagged for a manual check" }
        : {
            id: "manual",
            glyph: "◇",
            tone: "note",
            label: `${count(report.needsReview, "element")} ${report.needsReview === 1 ? "needs" : "need"} a manual check`,
          };

  const untested: Outcome = {
    id: "untested",
    glyph: "–",
    tone: "note",
    label: "Not tested: keyboard use, screen readers, signed-in pages, PDFs, and pages not reached",
  };

  return [wcag, best, manual, untested];
}
