import { SeverityChip } from "@/components/forensic/severity-chip";
import { Meter } from "@/components/forensic/meter";
import {
  SAMPLE_CONSOLE_RUNS,
  SAMPLE_SEVERITY_COUNTS,
  SAMPLE_TARGET,
} from "@/lib/sample-evidence";

/**
 * Marketing proof of the authenticated console — composed from the same primitives
 * the app uses (severity chips, meters, mono run-log). Counts grounded in the
 * SauceDemo / OrangeHRM probe set (experiments/net-new-violations).
 */
export function ConsolePreview({ className = "" }: { className?: string }) {
  return (
    <figure
      className={`overflow-hidden rounded-md border border-border bg-card ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 font-mono text-xs text-muted-foreground">
        <span className="select-none text-[var(--primary)]">┌─ </span>
        console · dashboard
        <span className="ml-auto rounded-sm border border-border px-1.5 py-0.5">sample</span>
      </div>

      <div className="grid gap-0 sm:grid-cols-[1.1fr_0.9fr]">
        <div className="border-b border-border p-4 sm:border-b-0 sm:border-r">
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            severity roll-up · {SAMPLE_TARGET.label}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <SeverityChip severity="critical" />
            <span className="font-mono text-sm tabular-nums text-foreground">
              {SAMPLE_SEVERITY_COUNTS.critical}
            </span>
            <SeverityChip severity="serious" />
            <span className="font-mono text-sm tabular-nums text-foreground">
              {SAMPLE_SEVERITY_COUNTS.serious}
            </span>
          </div>
          <Meter
            className="mt-5"
            value={1}
            total={3}
            label="task success"
            unit="probe targets with a blocked persona"
            tone="serious"
          />
        </div>

        <div className="font-mono text-sm">
          <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
            recent probe runs
          </div>
          <ul className="divide-y divide-border">
            {SAMPLE_CONSOLE_RUNS.map((row) => (
              <li key={row.host} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="truncate text-card-foreground">
                  <span className="select-none text-[var(--primary)]">›&nbsp;</span>
                  {row.host}
                </span>
                <span className="tabular-nums" style={{ color: row.tone }}>
                  {row.score}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <figcaption className="border-t border-border px-4 py-2.5 font-mono text-xs text-muted-foreground">
        grounded in {SAMPLE_TARGET.source} · not a live customer account
      </figcaption>
    </figure>
  );
}
