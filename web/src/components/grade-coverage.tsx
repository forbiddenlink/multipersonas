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
