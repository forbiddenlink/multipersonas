import type { GradeReport } from "@engine/grader/score";
import { gradeArithmetic } from "@/lib/grade-arithmetic";
import { SEVERITY } from "@/components/forensic/severity";

/**
 * The grading arithmetic, taken from the grader's own constants (see `gradeArithmetic`).
 * Per-page "checks passed" is not stored on a report, so the worked line starts from the
 * stored page scores rather than inventing the inputs above them.
 */
export function GradeMethodDisclosure({ report }: { report: GradeReport }) {
  const math = gradeArithmetic(report);
  const n = math.pageScores.length;

  return (
    <details className="group border-y border-border">
      <summary className="flex min-h-11 cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden gap-2 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]">
        <span aria-hidden="true" className="font-mono text-xs transition-transform group-open:rotate-90">
          ▸
        </span>
        How this grade is calculated
      </summary>
      <div className="space-y-5 pb-5 text-[0.9375rem] leading-relaxed">
        <div>
          <h3 className="label-mono">1. Each page</h3>
          <p className="mt-1.5 font-mono text-sm">page score = round(100 × P ÷ (P + W))</p>
          <p className="mt-1.5 max-w-2xl text-muted-foreground">
            P is the number of axe checks that passed on the page. W adds up the elements that fail a
            WCAG A/AA rule, each counted at its severity weight. Best-practice rules are listed
            but not weighted. A page with nothing testable scores 100.
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-sm">
            {math.weights.map((w) => (
              <li key={w.impact}>
                {SEVERITY[w.impact].label} <span className="tabular-nums">{w.weight}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="label-mono">2. The site</h3>
          <p className="mt-1.5 max-w-2xl text-muted-foreground">The mean of the page scores, rounded.</p>
          {n > 0 ? (
            <p className="mt-1.5 break-words font-mono text-sm tabular-nums">
              ({math.pageScores.join(" + ")}) ÷ {n} = {math.mean}
            </p>
          ) : null}
          {!math.reproduces ? (
            <p className="redline-note mt-2">
              This grade was stored before the scoring rule was recorded, so the page scores
              above may not reproduce the stored score of {report.score}.
            </p>
          ) : null}
        </div>

        <div>
          <h3 className="label-mono">3. The letter</h3>
          <ul className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1 font-mono text-sm tabular-nums">
            {math.bands.map((b) => (
              <li key={b.grade}>
                <span className={b.grade === report.grade ? "font-semibold underline underline-offset-4" : ""}>
                  {b.grade}
                  <span className="sr-only">{b.grade === report.grade ? " (this grade)" : ""}</span>
                </span>{" "}
                {b.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
