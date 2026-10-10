import { SeverityChip } from "@/components/forensic/severity-chip";
import { GradeFindingRow } from "@/components/dossier/grade-finding-row";
import { ruleFix } from "@/components/dossier/grade-remediation";
import type { Severity } from "@/components/forensic/severity";
import { criterionName } from "@/lib/wcag";
import { dequeRuleUrl } from "@/lib/grade-share";

export interface SampleFinding {
  ruleId: string;
  severity: Severity;
  wcag: string;
  help: string;
  location: string;
  state: string;
}

/**
 * The findings ledger for the sample report. From the `sm` breakpoint up it is a table
 * (rule, severity, WCAG success criterion, state), each finding followed by a full-width
 * row with the plain-language fix, so the table loses nothing the cards carry. Below `sm`
 * the same findings render as the case-file cards. Only one of the two is ever visible,
 * so a screen reader reads each finding once.
 */
export function SampleFindings({ findings }: { findings: readonly SampleFinding[] }) {
  return (
    <>
      <table className="mt-3 hidden w-full border-collapse text-left sm:table">
        <caption className="sr-only">Findings, one per row, in the order to fix them</caption>
        <thead>
          <tr className="border-b-2 border-foreground">
            <th scope="col" className="label-mono w-[34%] py-2 pr-3 font-normal">Rule</th>
            <th scope="col" className="label-mono w-[16%] py-2 pr-3 font-normal">Severity</th>
            <th scope="col" className="label-mono w-[20%] py-2 pr-3 font-normal">WCAG SC</th>
            <th scope="col" className="label-mono py-2 font-normal">State</th>
          </tr>
        </thead>
        {findings.map((f) => {
          const fix = ruleFix(f.ruleId);
          const name = criterionName(f.wcag);
          return (
            <tbody key={`${f.ruleId}-${f.state}`} className="border-b border-border align-top last:border-b-0">
              <tr>
                <th scope="row" className="pt-4 pr-3 text-left font-normal">
                  <span className="block font-mono text-xs">{f.ruleId}</span>
                  <span className="mt-0.5 block text-sm leading-snug">{f.help}</span>
                </th>
                <td className="pt-4 pr-3">
                  <SeverityChip severity={f.severity} />
                </td>
                <td className="pt-4 pr-3">
                  <span className="block font-mono text-xs tabular-nums">{f.wcag}</span>
                  {name ? <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{name}</span> : null}
                </td>
                <td className="pt-4 font-mono text-xs leading-relaxed break-words">{f.state}</td>
              </tr>
              <tr>
                <td colSpan={4} className="pb-4 pt-2 text-sm leading-relaxed">
                  {fix ? (
                    <p className="max-w-xl text-muted-foreground">
                      <span className="font-medium text-foreground">Fix: </span>
                      {fix.fix}
                    </p>
                  ) : null}
                  <p className="mt-1">
                    <a
                      href={dequeRuleUrl(f.ruleId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-link"
                    >
                      Learn more{" "}
                      <span className="sr-only">about {f.ruleId} on Deque University (opens in a new tab)</span>
                    </a>
                  </p>
                </td>
              </tr>
            </tbody>
          );
        })}
      </table>

      <ul className="mt-3 sm:hidden">
        {findings.map((f, i) => (
          <GradeFindingRow
            key={`${f.ruleId}-${f.state}`}
            domId={`finding-${i + 1}-${f.ruleId}`}
            ruleId={f.ruleId}
            severity={f.severity}
            help={f.help}
            wcagAA
            location={f.location}
          />
        ))}
      </ul>
    </>
  );
}
