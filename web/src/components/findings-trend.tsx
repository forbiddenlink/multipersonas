import type { FindingsTrendRow } from "@/lib/findings-trend";
import { SEVERITY, SEVERITY_ORDER } from "@/components/forensic/severity";

const HEAD = "py-2 pr-4 text-right font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground";

function formatChange(change: number | null): string {
  if (change === null) return "First run";
  if (change === 0) return "No change";
  return change > 0 ? `+${change}` : `−${Math.abs(change)}`;
}

function changeLabel(change: number | null): string {
  if (change === null) return "first run, no earlier run to compare";
  if (change === 0) return "no change from the previous run";
  return change > 0 ? `${change} more than the previous run` : `${Math.abs(change)} fewer than the previous run`;
}

/** Axe findings per completed run, oldest first. Only meaningful with two or more runs. */
export function FindingsTrend({ rows }: { rows: FindingsTrendRow[] }) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Findings over time table"
      className="min-w-0 overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
    >
      <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
        <caption className="sr-only">Accessibility findings detected in each run, by severity, oldest first</caption>
        <thead>
          <tr className="border-b-2 border-foreground">
            <th scope="col" className="py-2 pr-4 font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground">
              Run date
            </th>
            {SEVERITY_ORDER.map((s) => (
              <th key={s} scope="col" className={HEAD}>
                {SEVERITY[s].label}
              </th>
            ))}
            <th scope="col" className={HEAD}>
              Total
            </th>
            <th scope="col" className="py-2 text-right font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground">
              Change
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.runId} className="border-b border-border">
              <th scope="row" className="py-3 pr-4 font-normal text-muted-foreground">
                {new Date(row.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </th>
              {SEVERITY_ORDER.map((s) => (
                <td key={s} className="py-3 pr-4 text-right font-mono tabular-nums">
                  {row.counts[s]}
                </td>
              ))}
              <td className="py-3 pr-4 text-right font-mono font-medium tabular-nums">{row.total}</td>
              <td className="py-3 text-right font-mono tabular-nums">
                <span
                  aria-hidden="true"
                  className={
                    row.change !== null && row.change > 0
                      ? "text-[var(--redline)]"
                      : "text-muted-foreground"
                  }
                >
                  {formatChange(row.change)}
                </span>
                <span className="sr-only">{changeLabel(row.change)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
