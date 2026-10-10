import { SeverityChip } from "@/components/forensic/severity-chip";
import { WcagCitation } from "@/components/forensic/wcag-citation";
import { ruleFix } from "@/components/dossier/grade-remediation";
import { dequeRuleUrl } from "@/lib/grade-share";
import type { Severity } from "@/components/forensic/severity";
import { displayPath } from "@/lib/format";
import type { GradeNodeExample } from "@engine/grader/score";

/**
 * One finding as a case-file evidence row: severity + WCAG citation, the axe rule name,
 * a plain-English "why it matters" and "how to fix it". Remediation text is looked up
 * from `grade-remediation.ts` by axe rule id only — a rule id with no entry there falls
 * back to axe's own `help` text with no invented WCAG citation (DESIGN.md honesty wall).
 */
export function GradeFindingRow({
  ruleId,
  severity,
  help,
  nodes,
  wcagAA,
  examples,
  location,
  fixFirst,
  domId,
}: {
  ruleId: string;
  severity: Severity;
  help: string;
  nodes?: number;
  wcagAA?: boolean;
  /** A few located elements (selector + HTML). Absent on reports stored before examples. */
  examples?: GradeNodeExample[];
  /** Where it was found — a URL, a state label, or both. */
  location?: string;
  /** Top-priority finding: labelled so the reader knows where to start. */
  fixFirst?: boolean;
  /** Anchor id. Defaults to `finding-<ruleId>`; set it when one rule appears more than once. */
  domId?: string;
}) {
  const fix = ruleFix(ruleId);

  return (
    <li id={domId ?? `finding-${ruleId}`} className="scroll-mt-6 border-b border-border py-5">
      <div className="flex flex-wrap items-center gap-2">
        {fixFirst ? <span className="redline-note uppercase tracking-[0.1em]">Fix first</span> : null}
        <SeverityChip severity={severity} />
        <span className="font-mono text-xs text-muted-foreground">{ruleId}</span>
        {/* axe's own tags win over the remediation map: a rule axe files as best-practice
            (region, landmark-one-main) gets no criterion citation even where the fix text
            relates it to one, or the row contradicts the "0 WCAG A/AA failures" count.
            `wcagAA` undefined = report predates the field; keep the citations there. */}
        {fix && wcagAA !== false ? (
          <span className="flex flex-wrap items-center gap-1.5">
            {fix.wcag.map((code) => (
              <WcagCitation key={code} code={code} />
            ))}
          </span>
        ) : !wcagAA ? (
          <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            best-practice
          </span>
        ) : null}
        {typeof nodes === "number" ? (
          <span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
            {nodes} node{nodes === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
      <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed">{fix?.why ?? help}</p>
      {fix ? (
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Fix: </span>
          {fix.fix}
        </p>
      ) : null}
      {examples && examples.length > 0 ? (
        <details className="group mt-3 max-w-2xl">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-sm text-sm font-medium sm:min-h-0 [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]">
            <span aria-hidden="true" className="font-mono text-muted-foreground">
              <span className="group-open:hidden">+</span>
              <span className="hidden group-open:inline">&minus;</span>
            </span>
            {typeof nodes === "number" && nodes > examples.length
              ? `Where: ${examples.length} of ${nodes} elements`
              : `Where: ${examples.length} element${examples.length === 1 ? "" : "s"}`}
          </summary>
          <ul className="mt-2 space-y-3 border-l-2 border-border pl-3">
            {examples.map((ex, i) => (
              <li key={`${ex.url}-${ex.target}-${i}`} className="min-w-0 text-xs">
                <p className="text-muted-foreground">
                  on <span className="font-mono">{displayPath(ex.url)}</span>
                </p>
                <p className="mt-1 font-mono break-all">{ex.target}</p>
                <pre className="mt-1 whitespace-pre-wrap break-all rounded-sm bg-muted px-2 py-1.5 font-mono text-[11px] leading-relaxed">
                  <code>{ex.html}</code>
                </pre>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <p className="mt-1.5 text-sm">
        <a
          href={dequeRuleUrl(ruleId)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-link inline-flex min-h-11 items-center sm:min-h-0"
        >
          Learn more{" "}
          <span className="sr-only">about {ruleId} on Deque University (opens in a new tab)</span>
        </a>
      </p>
      {location ? (
        <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">found at {location}</p>
      ) : null}
    </li>
  );
}
