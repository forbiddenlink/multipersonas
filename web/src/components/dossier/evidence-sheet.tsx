import { SeverityChip } from "@/components/forensic/severity-chip";
import { SAMPLE_VERDICTS } from "@/lib/sample-evidence";

/**
 * Hero artifact: two stacked sheets from a real SauceDemo case file. The top sheet
 * carries the verdicts, highlighter on the evidence, a redline margin note, and the
 * stamp. Server-rendered and static, so the first paint is the finished document.
 */
export function EvidenceSheet({ className = "" }: { className?: string }) {
  const [first, second] = SAMPLE_VERDICTS;
  return (
    <figure className={className} aria-label="Sample case file for saucedemo.com">
      <div className="relative">
      {/* The sheet underneath — offset, only its edge shows. */}
      <div
        aria-hidden="true"
        className="sheet absolute inset-x-6 -top-3 bottom-3 rotate-[1.4deg] sm:inset-x-10"
      />
      <div className="file-tab relative ml-5">
        <span>Case PA-0426</span>
        <span className="text-foreground/70">·</span>
        <span>saucedemo.com</span>
      </div>
      <article className="report-paper-surface sheet margin-rule relative -mt-px pl-12 pr-5 pb-6 pt-6 sm:pl-14 sm:pr-8">
        <header className="border-b-2 border-foreground pb-4">
          <p className="label-mono">Accessibility evidence · WCAG 2.2 AA</p>
          <p className="display mt-1.5 text-[1.65rem] leading-tight">The public page passed. The flow behind it didn&apos;t.</p>
        </header>

        <div className="relative mt-5 space-y-5">
          <section>
            <div className="flex flex-wrap items-center gap-2">
              <SeverityChip severity={second.severity} ruleId={second.wcag} />
              <span className="font-mono text-xs text-muted-foreground">{second.ruleId}</span>
            </div>
            <p className="mt-2 font-serif text-[0.975rem] leading-relaxed">
              The inventory sort control has no accessible name.{" "}
              <span className="mark">Behind auth, a crawler without a session never reaches it.</span>
            </p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">found at /inventory · signed-in state</p>
          </section>

          <section className="border-t border-border pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityChip severity={first.severity} ruleId={first.wcag} />
              <span className="font-mono text-xs text-muted-foreground">{first.ruleId}</span>
            </div>
            <p className="mt-2 font-serif text-[0.975rem] leading-relaxed">
              The error-dismiss control on checkout validation exposes no name, so a screen
              reader announces only <span className="mark">&ldquo;button.&rdquo;</span>
            </p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">found at /checkout · validation error</p>
          </section>
        </div>

        <footer className="mt-6 flex flex-col-reverse gap-4 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-[16rem] font-mono text-[10.5px] leading-relaxed text-muted-foreground">
            axe-core verdicts only. Deterministic, reproducible, no AI opinion on this page.
          </p>
          <div className="stamp shrink-0 self-end text-[0.7rem] sm:self-auto" aria-label="Verdict: 3 critical findings, 0 on the public page">
            <span className="text-[1.35rem] leading-none tracking-[0.04em]">3 Critical</span>
            <span className="text-[0.6rem] tracking-[0.14em]">0 on public page</span>
          </div>
        </footer>
      </article>
      </div>
      <figcaption className="relative mt-4 pl-5 font-mono text-[11px] text-muted-foreground">
        Real probe of the SauceDemo test store. Not a customer account.
      </figcaption>
    </figure>
  );
}
