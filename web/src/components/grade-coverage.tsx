import type { GradeReport } from "@engine/grader/score";

/**
 * The honesty note: what this grade does NOT cover. Required on every public grade
 * per DESIGN.md — a redline margin note, not a footnote, so it can't be skimmed past.
 */
export function GradeCoverage({ report }: { report: GradeReport }) {
  return (
    <section aria-label="Scan coverage" className="margin-rule border-t border-border pl-8 pt-5 sm:pl-10">
      <h2 className="redline-note uppercase tracking-[0.1em]">What this grade doesn&apos;t cover</h2>
      {report.coverage ? (
        <p className="mt-2 text-[0.9375rem] leading-relaxed">
          {report.pagesScanned} page{report.pagesScanned === 1 ? "" : "s"} evaluated with a{" "}
          {report.coverage.pageLimit}-page limit.
          {report.coverage.skippedPages > 0
            ? report.coverage.skippedPages === 1
              ? " 1 discovered URL was not evaluated because it could not be scanned or was outside the page limit."
              : ` ${report.coverage.skippedPages} discovered URLs were not evaluated because they could not be scanned or were outside the page limit.`
            : ""}
        </p>
      ) : (
        <p className="mt-2 text-[0.9375rem] leading-relaxed">
          This older report does not include the page limit or the number of discovered URLs left untested.
        </p>
      )}
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        The grade covers only evaluated public pages and automated axe checks. It does not
        cover every site page, signed-in content, interactive state, or accessibility
        requirement. Automated checks catch a portion of WCAG issues; keyboard and
        screen-reader testing still need a person. Behind-login pages need the CLI.
      </p>
    </section>
  );
}

const DEQUE_STUDY_URL =
  "https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues/";

/**
 * One line beside the grade, before anyone screenshots it: what the letter is built from
 * and what it is not. `needsReview` is axe's own "incomplete" count; undefined on reports
 * stored before it was recorded, and then no count is claimed.
 */
export function GradeCoverageNote({ needsReview }: { needsReview: number | undefined }) {
  return (
    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
      This grade covers automated checks only: a person has to check the rest. Automated tools
      find about 57% of issues by volume (
      <a href={DEQUE_STUDY_URL} target="_blank" rel="noopener noreferrer" className="text-link">
        Deque, 2021 study<span className="sr-only"> (opens in a new tab)</span>
      </a>
      ).
      {needsReview && needsReview > 0 ? (
        <>
          {" "}
          <span className="font-medium text-foreground">
            {needsReview} element{needsReview === 1 ? "" : "s"} {needsReview === 1 ? "needs" : "need"} a human check
          </span>{" "}
          (axe could not decide).
        </>
      ) : null}
    </p>
  );
}
