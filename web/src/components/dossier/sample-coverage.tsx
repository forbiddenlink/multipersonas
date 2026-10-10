import { buildConformance } from "@/lib/conformance";
import type { Criterion } from "@/lib/wcag";
import { WCAG22_AA_CATALOG } from "@/lib/wcag-catalog";
import { coverageKind, testedCodes, type ScanOptions } from "@/lib/wcag-coverage";

type Result = "failed" | "no-failures" | "manual" | "not-evaluated";

const PRINCIPLES: Record<string, string> = {
  "1": "1 Perceivable",
  "2": "2 Operable",
  "3": "3 Understandable",
  "4": "4 Robust",
};

const RESULT_LABEL: Record<Result, string> = {
  failed: "Failure found",
  "no-failures": "No axe-core detectable failures",
  manual: "Manual check",
  "not-evaluated": "Not evaluated",
};

/**
 * Per-criterion coverage for the sample report: which WCAG 2.2 A/AA success criteria
 * axe-core tested and what it found, which only a person can check, and which were not
 * evaluated. It reuses the conformance engine for the fail/clean/manual split and
 * `wcag-coverage.ts` for the not-evaluated split, so it cannot disagree with the signed-in
 * report. The wording never says a criterion is met: axe checks part of a criterion at most.
 */
export function SampleCoverage({
  verdicts,
  scan,
}: {
  verdicts: ReadonlyArray<{ criteria: Criterion[] }>;
  /** The tag filter the sample's scan used, so criteria it could not run read as not evaluated. */
  scan: ScanOptions;
}) {
  const { rows } = buildConformance(verdicts, WCAG22_AA_CATALOG, testedCodes(scan));
  const results = rows.map((row) => {
    const result: Result =
      row.status === "fails-automated"
        ? "failed"
        : row.status === "passes-automated"
          ? "no-failures"
          : coverageKind(row.code, scan) === "not-evaluated"
            ? "not-evaluated"
            : "manual";
    return { ...row, result };
  });
  const count = (r: Result) => results.filter((x) => x.result === r).length;
  const order: Result[] = ["failed", "no-failures", "manual", "not-evaluated"];

  return (
    <>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        What axe-core could and could not check, one row per success criterion. A row is not a
        pass mark: axe tests part of a criterion at most, so a person still verifies every
        row.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
        {order.map((r) => (
          <div key={r} className="border-t border-foreground pt-2">
            <dt className="min-h-8 text-xs leading-snug text-muted-foreground">{RESULT_LABEL[r]}</dt>
            <dd className="mt-1 font-mono text-2xl tabular-nums">{count(r)}</dd>
          </div>
        ))}
      </dl>
      <table role="table" className="mt-6 w-full border-collapse text-left text-sm">
        <caption className="sr-only">WCAG 2.2 A and AA success criteria and what automated checking found</caption>
        <thead role="rowgroup" className="hidden sm:table-header-group">
          <tr role="row" className="border-b-2 border-foreground">
            <th role="columnheader" scope="col" className="label-mono w-16 py-2 pr-3 font-normal">SC</th>
            <th role="columnheader" scope="col" className="label-mono py-2 pr-3 font-normal">Criterion</th>
            <th role="columnheader" scope="col" className="label-mono w-14 py-2 pr-3 font-normal">Level</th>
            <th role="columnheader" scope="col" className="label-mono w-[38%] py-2 font-normal">axe-core result</th>
          </tr>
        </thead>
        {Object.entries(PRINCIPLES).map(([digit, title]) => (
          <tbody key={digit} role="rowgroup">
            <tr role="row">
              <th
                role="columnheader"
                scope="colgroup"
                colSpan={4}
                className="label-mono border-b border-foreground pb-1.5 pt-6 text-left font-normal"
              >
                {title}
              </th>
            </tr>
            {results
              .filter((r) => r.code.startsWith(`${digit}.`))
              .map((r) => (
                <tr
                  key={r.code}
                  role="row"
                  className="border-b border-border max-sm:grid max-sm:grid-cols-[3.25rem_minmax(0,1fr)] max-sm:gap-x-2 max-sm:py-2"
                >
                  <th
                    role="rowheader"
                    scope="row"
                    className="py-1.5 pr-3 text-left align-top font-mono text-xs font-normal tabular-nums max-sm:py-0"
                  >
                    {r.code}
                  </th>
                  <td role="cell" className="py-1.5 pr-3 align-top leading-snug max-sm:py-0">
                    {r.name}
                    <span className="font-mono text-xs text-muted-foreground sm:hidden"> · {r.level}</span>
                  </td>
                  <td role="cell" className="hidden py-1.5 pr-3 align-top font-mono text-xs sm:table-cell">
                    {r.level}
                  </td>
                  <td
                    role="cell"
                    className={`py-1.5 align-top leading-snug max-sm:col-start-2 max-sm:py-0 max-sm:pt-1 ${
                      r.result === "failed"
                        ? "font-medium text-[var(--redline)]"
                        : r.result === "manual"
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    {r.result === "failed" ? (
                      <>
                        <span aria-hidden="true" className="text-[0.7em]">■ </span>
                        {RESULT_LABEL.failed}
                        <span className="font-mono text-xs tabular-nums">
                          {" "}· {r.violationCount} {r.violationCount === 1 ? "finding" : "findings"}
                        </span>
                      </>
                    ) : r.result === "manual" ? (
                      <>
                        <span aria-hidden="true" className="font-mono">☐ </span>
                        {RESULT_LABEL.manual}
                      </>
                    ) : r.result === "not-evaluated" ? (
                      <>
                        <span aria-hidden="true" className="font-mono">– </span>
                        {RESULT_LABEL["not-evaluated"]}
                      </>
                    ) : (
                      RESULT_LABEL["no-failures"]
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        ))}
      </table>
      <p className="mt-4 max-w-xl text-xs leading-relaxed text-muted-foreground">
        Not evaluated means no axe-core rule ran for that criterion in this probe: the rules are
        experimental or retired, or need a WCAG 2.2 scan this probe did not use. Manual check means axe-core has no rule for it.
      </p>
    </>
  );
}

const MANUAL_FIELDS = [
  { label: "Reviewer", wide: false },
  { label: "Date", wide: false },
  { label: "Keyboard pass", wide: false },
  { label: "Screen reader and version", wide: false },
  { label: "Notes", wide: true },
] as const;

/**
 * A blank record for the agency's own manual pass. Presentational: nothing is collected or
 * stored here, it is the empty field a client sees on the delivered document.
 */
export function ManualReviewRecord() {
  return (
    <div className="mt-8 border border-dashed border-input p-4 sm:p-5">
      <h3 className="label-mono">Manual review record</h3>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        For the reviewing agency to complete by hand: its own keyboard and screen-reader
        pass over the rows marked Manual check. Personaudit does not fill this in.
      </p>
      <dl aria-hidden="true" className="mt-4 grid gap-x-6 gap-y-6 sm:grid-cols-2">
        {MANUAL_FIELDS.map((f) => (
          <div key={f.label} className={f.wide ? "sm:col-span-2" : undefined}>
            <dt className="label-mono">{f.label}</dt>
            <dd className={`mt-2 border-b border-input ${f.wide ? "h-16" : "h-6"}`} />
          </div>
        ))}
      </dl>
    </div>
  );
}
