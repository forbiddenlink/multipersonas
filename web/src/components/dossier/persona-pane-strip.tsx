import { prebuiltPersonas } from "@engine/personas/prebuilt";
import { PERSONA_DATA, type PersonaId } from "@/lib/personas";
import { SAMPLE_PANE_PAGE, SAMPLE_PANE_PERSONAS } from "@/lib/sample-evidence";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { BatesSerial } from "@/components/dossier/exhibit-head";

/** What the persona actually does differently, from its own definition. */
function modalityLabel(id: PersonaId): string {
  const p = prebuiltPersonas[id]!;
  const input = p.inputModality === "keyboard" ? "keyboard" : p.isMobile ? "touch" : "pointer";
  const net = p.connectionSpeed === "fast" ? null : p.connectionSpeed;
  return [`${p.viewport.width} x ${p.viewport.height}`, input, net].filter(Boolean).join(" · ");
}

/** Decorative miniature of the sample page (checkout validation error), sized per viewport. */
function PageMock({ mobile }: { mobile: boolean }) {
  const box = mobile ? "w-[38%]" : "w-full";
  return (
    <div
      aria-hidden="true"
      className={`${box} mx-auto flex h-full flex-col overflow-hidden rounded-xs border border-border bg-background`}
    >
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-card px-1.5 py-1">
        <span className="h-1.5 w-1.5 rounded-full bg-border" />
        <span className="truncate font-mono text-[8px] leading-none text-muted-foreground">
          {mobile ? "saucedemo.com" : SAMPLE_PANE_PAGE.host + SAMPLE_PANE_PAGE.path}
        </span>
      </div>
      <div className="flex-1 space-y-1.5 p-2">
        <div className="flex items-center justify-between rounded-xs border border-[var(--redline)] bg-card px-1.5 py-1">
          <span className="truncate font-mono text-[8px] font-bold leading-none text-[var(--redline)]">
            Error: Postal Code is required
          </span>
          <span className="ml-1 h-3 w-3 shrink-0 border border-dashed border-[var(--redline)]" />
        </div>
        <div className="h-2 rounded-xs border border-border bg-card" />
        <div className="h-2 rounded-xs border border-border bg-card" />
        <div className="h-2 rounded-xs border border-border bg-card" />
        <div className="flex justify-between pt-1">
          <span className="h-3 w-1/3 rounded-xs bg-border" />
          <span className="h-3 w-1/3 rounded-xs bg-primary" />
        </div>
      </div>
    </div>
  );
}

/**
 * Hero artifact: one sample page, shown once per persona. Persona names, roles, viewports
 * and input modes come from the engine's own definitions. The axe finding is the real
 * SauceDemo probe result for that state; axe is deterministic, so every persona sees the
 * same count. Below `lg` the panes scroll sideways inside a named, focusable region.
 */
export function PersonaPaneStrip({ className = "" }: { className?: string }) {
  const findings = SAMPLE_PANE_PAGE.findings;
  return (
    <figure className={className} aria-label="One sample page, shown for four personas">
      <div className="file-tab ml-1">
        <span>Case PA-0426</span>
        <span className="text-foreground/70">·</span>
        <span>{SAMPLE_PANE_PAGE.host}</span>
      </div>
      <div className="report-paper-surface sheet -mt-px p-3 sm:p-4">
        <p className="label-mono">Same page, four personas</p>
        <div
          role="region"
          tabIndex={0}
          aria-label="Persona panes, scroll sideways"
          className="mt-3 min-w-0 overflow-x-auto pb-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] lg:overflow-visible lg:pb-0"
        >
          <ul className="flex snap-x gap-3 lg:grid lg:grid-cols-2">
            {SAMPLE_PANE_PERSONAS.map((id) => {
              const persona = PERSONA_DATA[id];
              const mobile = prebuiltPersonas[id]!.isMobile;
              return (
                <li
                  key={id}
                  className="flex w-[13.5rem] shrink-0 snap-start flex-col rounded-sm border border-border bg-card lg:w-auto"
                >
                  <div className="min-h-[4.25rem] border-b border-border px-3 py-2">
                    <p className="font-semibold leading-tight">{persona.name}</p>
                    <p className="text-xs text-muted-foreground">{persona.role}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{modalityLabel(id)}</p>
                  </div>
                  <div className="h-28 bg-muted/40 p-2">
                    <PageMock mobile={mobile} />
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border px-3 py-2">
                    <SeverityChip severity={findings[0].severity} ruleId={findings[0].wcag} />
                    <span className="font-mono text-xs tabular-nums">
                      {findings.length} {findings.length === 1 ? "issue" : "issues"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="mt-3 flex flex-col-reverse gap-3 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-[18rem] font-mono text-xs leading-relaxed text-muted-foreground">
            {SAMPLE_PANE_PAGE.findingNote}
          </p>
          <div
            className="stamp stamp-land shrink-0 self-end text-[0.7rem] sm:self-auto"
            aria-label={`Verdict: ${findings.length} critical finding on this page, same for every persona`}
          >
            <span className="text-[1.35rem] leading-none tracking-[0.04em]">{findings.length} Critical</span>
            <span className="text-xs tracking-[0.14em]">all four personas</span>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pl-1 font-mono text-xs text-muted-foreground">
        <span>Real probe of the SauceDemo test store. Not a customer account.</span>
        <BatesSerial n="0001" className="shrink-0" />
      </figcaption>
    </figure>
  );
}
