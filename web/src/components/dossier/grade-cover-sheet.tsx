import Link from "next/link";
import type { GradeReport } from "@engine/grader/score";
import { GradeVerdictStamp } from "@/components/dossier/grade-verdict-stamp";
import { AXE_DOCS_VERSION } from "@/lib/grade-share";
import { gradeOutcomes, pagesReached, scannedAtUtc, type OutcomeTone } from "@/lib/grade-cover";

const TONE_COLOR: Record<OutcomeTone, string> = {
  fail: "var(--severity-critical)",
  pass: "var(--primary)",
  note: "var(--muted-foreground)",
};

/**
 * The first screen of a shared grade: the letter, what the letter means, and the facts a
 * reader needs to place it in time. Every outcome is a glyph plus a sentence, so colour
 * never carries the state alone. The definition says what the grade is built from and
 * stops there; it makes no claim about the site beyond the pages and checks listed.
 */
export function GradeCoverSheet({
  report,
  host,
  createdAt,
  token,
}: {
  report: GradeReport;
  host: string;
  createdAt: string;
  token: string;
}) {
  const outcomes = gradeOutcomes(report);

  return (
    <section aria-labelledby="grade-meaning-heading">
      <div className="grid items-start gap-x-10 gap-y-6 md:grid-cols-[auto_minmax(0,1fr)]">
        <GradeVerdictStamp grade={report.grade} score={report.score} animate className="justify-self-start md:ml-2" />
        <div className="min-w-0">
          <h2 id="grade-meaning-heading" className="label-mono">
            What this grade means
          </h2>
          <p className="mt-2 max-w-xl text-[1.0625rem] leading-relaxed">
            The letter summarizes how many automated axe-core checks passed on the pages reached,
            with each WCAG A/AA failure weighted by severity. It is a count of what a tool could
            detect, not a finding about the whole site.
          </p>
          <ul className="mt-4 space-y-2">
            {outcomes.map((o) => (
              <li key={o.id} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-2 text-[0.9375rem] leading-snug">
                <span
                  aria-hidden="true"
                  className="text-center font-mono"
                  style={{ color: TONE_COLOR[o.tone] }}
                >
                  {o.glyph}
                </span>
                <span className={o.tone === "note" ? "text-muted-foreground" : "font-medium"}>
                  {o.label}
                  {o.id === "untested" ? (
                    <>
                      {" "}
                      (
                      <Link href="/method" className="text-link">
                        method
                      </Link>
                      )
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-5 md:grid-cols-4">
        <Fact label="Site" value={host} wrap />
        <Fact
          label="Scanned"
          value={<time dateTime={createdAt}>{scannedAtUtc(createdAt)}</time>}
        />
        <Fact label="Pages reached" value={pagesReached(report)} />
        <Fact label="Engine" value={`axe-core ${AXE_DOCS_VERSION}`} />
      </dl>
      <p className="mt-4 font-mono text-xs leading-relaxed text-muted-foreground">
        <span className="uppercase tracking-[0.08em]">Permalink</span>{" "}
        <Link href={`/grade/${token}`} className="text-link break-all">
          /grade/{token}
        </Link>{" "}
        <span aria-hidden="true">·</span> result as of {scannedAtUtc(createdAt)}
      </p>
    </section>
  );
}

function Fact({ label, value, wrap = false }: { label: string; value: React.ReactNode; wrap?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="label-mono">{label}</dt>
      <dd className={`mt-1 font-mono text-sm ${wrap ? "break-all" : ""}`}>{value}</dd>
    </div>
  );
}
