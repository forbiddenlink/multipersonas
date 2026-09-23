import type { GradeReport } from "@engine/grader/score";

export function GradeCoverage({ report }: { report: GradeReport }) {
  return (
    <section aria-label="Scan coverage" className="space-y-2 rounded-md border border-border p-4 text-sm">
      <h2 className="font-semibold">Scan coverage</h2>
      {report.coverage ? (
        <p>
          {report.pagesScanned} pages evaluated with a {report.coverage.pageLimit}-page limit.
          {" "}{report.coverage.skippedPages} discovered URLs were not evaluated because they could not be scanned or were outside the page limit.
        </p>
      ) : <p>This older report does not include the page limit or the number of discovered URLs left untested.</p>}
      <p className="text-muted-foreground">
        The grade covers only evaluated public pages and automated axe checks. It does not cover every site page, signed-in content, interactive state, or accessibility requirement.
      </p>
    </section>
  );
}
