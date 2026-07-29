import { SeverityChip } from "./severity-chip";
import { WcagCitation } from "./wcag-citation";

// A real (sample) violation-record excerpt, rendered in the report's own language so
// marketing and product agree. Serif verdict body + mono rule IDs + WCAG citation. This
// is the homepage credibility piece — nobody in the category shows an actual report.
// Verdicts only (axe-core): personas never appear here as findings.

type Record = {
  ruleId: string;
  severity: string;
  wcag: string;
  verdict: string;
  location: string;
};

const SAMPLE: Record[] = [
  {
    ruleId: "button-name",
    severity: "critical",
    wcag: "4.1.2",
    verdict:
      "The “Complete payment” control exposes no accessible name, so assistive technology announces only “button.” A screen-reader user cannot know what the control does.",
    location: "shop.example/checkout — payment step",
  },
  {
    ruleId: "color-contrast",
    severity: "serious",
    wcag: "1.4.3",
    verdict:
      "The order total renders at 3.9:1 against its background, below the 4.5:1 minimum for body text. Low-vision users may be unable to read the amount they are about to pay.",
    location: "shop.example/checkout — order summary",
  },
];

export function ReportExcerpt({ className = "" }: { className?: string }) {
  return (
    <figure
      className={`overflow-hidden rounded-md border border-border bg-card ${className}`}
    >
      {/* console-toolbar frame */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 font-mono text-xs text-muted-foreground">
        <span className="text-[var(--primary)]">›</span>
        <span>report — accessibility violation record</span>
        <span className="ml-auto rounded-sm border border-border px-1.5 py-0.5 tabular-nums">
          sample excerpt
        </span>
      </div>

      <div className="divide-y divide-border">
        {SAMPLE.map((r) => (
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
        deterministic · reproducible · cited to WCAG 2.1 AA
      </figcaption>
    </figure>
  );
}
