import { SeverityChip } from "@/components/forensic/severity-chip";
import { SAMPLE_TARGET, SAMPLE_VERDICTS } from "@/lib/sample-evidence";

/**
 * Paper report preview — white evidence document framed by console chrome.
 * Verdicts from the SauceDemo probe (experiments/net-new-violations).
 */
export function ReportPaper({ className = "" }: { className?: string }) {
  return (
    <figure
      className={`overflow-hidden rounded-md border border-border bg-card ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 font-mono text-xs text-muted-foreground">
        <span className="select-none text-[var(--primary)]">›</span>
        <span>export — accessibility report</span>
        <span className="ml-auto rounded-sm border border-border px-1.5 py-0.5">VPAT-lite</span>
      </div>

      <div className="bg-[oklch(0.24_0.008_70)] p-4 sm:p-6">
        <article className="rounded-sm bg-white px-5 py-6 text-[#111827] shadow-sm sm:px-8 sm:py-8">
          <header className="border-b-2 border-[#111827] pb-4">
            <p className="font-mono text-[11px] uppercase tracking-wide text-[#4b5563]">
              Accessibility evidence report
            </p>
            <h3 className="mt-1 text-xl font-bold tracking-tight">{SAMPLE_TARGET.host}</h3>
            <p className="mt-1 font-mono text-xs text-[#4b5563]">
              Prepared by Personaudit · axe-core · WCAG 2.2 AA · {SAMPLE_TARGET.label}
            </p>
          </header>

          <div className="mt-5 space-y-4">
            {SAMPLE_VERDICTS.map((r, i) => (
              <div key={r.ruleId} className={i > 0 ? "border-t border-[#e5e7eb] pt-4" : undefined}>
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityChip severity={r.severity} ruleId={r.wcag} />
                  <span className="font-mono text-xs text-[#4b5563]">{r.ruleId}</span>
                </div>
                <p className="mt-2 font-serif text-sm leading-relaxed text-[#1f2937]">{r.verdict}</p>
                <p className="mt-1 font-mono text-[11px] text-[#6b7280]">found at {r.location}</p>
              </div>
            ))}
          </div>

          <footer className="mt-6 border-t border-[#e5e7eb] pt-3 font-mono text-[10px] text-[#6b7280]">
            Verdicts only · persona opinion excluded · deterministic · reproducible
          </footer>
        </article>
      </div>

      <figcaption className="border-t border-border px-4 py-2.5 font-mono text-xs text-muted-foreground">
        from {SAMPLE_TARGET.source} · sample excerpt
      </figcaption>
    </figure>
  );
}
