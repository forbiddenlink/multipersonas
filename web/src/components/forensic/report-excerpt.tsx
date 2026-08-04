import { SeverityChip } from "./severity-chip";
import { WcagCitation } from "./wcag-citation";
import { SAMPLE_TARGET, SAMPLE_VERDICTS } from "@/lib/sample-evidence";

// Real probe violation-record excerpt (SauceDemo), rendered in the report's own language.
// Verdicts only (axe-core): personas never appear here as findings.

export function ReportExcerpt({ className = "" }: { className?: string }) {
  return (
    <figure
      className={`overflow-hidden rounded-md border border-border bg-card ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 font-mono text-xs text-muted-foreground">
        <span className="text-[var(--primary)]">›</span>
        <span>report — accessibility violation record</span>
        <span className="ml-auto rounded-sm border border-border px-1.5 py-0.5 tabular-nums">
          {SAMPLE_TARGET.label}
        </span>
      </div>

      <div className="divide-y divide-border">
        {SAMPLE_VERDICTS.map((r) => (
          <div key={r.ruleId} className="px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <SeverityChip severity={r.severity} />
              <span className="font-mono text-sm tabular-nums text-foreground">{r.ruleId}</span>
              <WcagCitation code={r.wcag} />
            </div>
            <p className="mt-3 max-w-prose font-serif text-[0.95rem] leading-relaxed text-card-foreground">
              {r.verdict}
            </p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              <span className="select-none">found at&nbsp;</span>
              {r.location}
            </p>
          </div>
        ))}
      </div>

      <figcaption className="border-t border-border px-4 py-2.5 font-mono text-xs text-muted-foreground">
        deterministic · from {SAMPLE_TARGET.source} · cited to WCAG 2.2 AA
      </figcaption>
    </figure>
  );
}
