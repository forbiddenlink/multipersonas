import { SeverityChip } from "@/components/forensic/severity-chip";
import { WcagCitation } from "@/components/forensic/wcag-citation";
import { ruleFix } from "@/components/dossier/grade-remediation";
import type { Severity } from "@/components/forensic/severity";

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
  location,
}: {
  ruleId: string;
  severity: Severity;
  help: string;
  nodes?: number;
  wcagAA?: boolean;
  /** Where it was found — a URL, a state label, or both. */
  location?: string;
}) {
  const fix = ruleFix(ruleId);

  return (
    <li className="border-b border-border py-5">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityChip severity={severity} />
        <span className="font-mono text-xs text-muted-foreground">{ruleId}</span>
        {fix ? (
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
      {location ? (
        <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">found at {location}</p>
      ) : null}
    </li>
  );
}
