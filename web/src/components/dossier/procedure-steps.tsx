export type ProcedureStep = {
  n: string;
  title: string;
  body: string;
  /** A shell command, or a line of output when it starts with an arrow. */
  cmd: string;
};

const isOutput = (cmd: string) => cmd.startsWith("→");

/**
 * Numbered CLI steps in two shapes, from one data list.
 *
 * - `terminal`: mono transcript for a full-bleed ink band (`bg-foreground text-background`).
 *   No tab scaffold. Two columns on desktop.
 * - `ledger`: ruled rows on paper, number | explanation | command.
 *
 * Below `md` both render each step as a native `<details>` disclosure, so a phone shows four
 * short rows instead of four stacked paragraphs. No JavaScript: the wide layout is plain
 * markup and the narrow one is `<details>`, switched by CSS display. The hidden copy is
 * `display: none`, so assistive tech reads one list, not two.
 */
export function ProcedureSteps({
  steps,
  variant,
  className = "",
}: {
  steps: readonly ProcedureStep[];
  variant: "terminal" | "ledger";
  className?: string;
}) {
  return variant === "terminal" ? (
    <TerminalSteps steps={steps} className={className} />
  ) : (
    <LedgerSteps steps={steps} className={className} />
  );
}

/* Colors come from tokens only: the band is ink in light mode and paper in dark mode, the
   same inversion the exhibit tab already makes. */
const BAND_MUTED = "text-[color-mix(in_oklch,var(--background)_74%,var(--foreground))]";
const BAND_RULE = "border-[color-mix(in_oklch,var(--background)_26%,var(--foreground))]";

function TerminalSteps({ steps, className }: { steps: readonly ProcedureStep[]; className: string }) {
  return (
    <div className={className}>
      <ol className="hidden gap-x-14 gap-y-10 font-mono md:grid md:grid-cols-2">
        {steps.map((s) => (
          <li key={s.n} className="min-w-0">
            <h3 className="text-[0.9375rem] font-semibold leading-snug">
              <span className={`mr-3 font-normal tabular-nums ${BAND_MUTED}`}>{s.n.padStart(2, "0")}</span>
              {s.title}
            </h3>
            <p className={`mt-2 max-w-md pl-9 text-[13px] leading-relaxed ${BAND_MUTED}`}>{s.body}</p>
            <TerminalLine cmd={s.cmd} className="mt-3 pl-9" />
          </li>
        ))}
      </ol>

      <div className={`border-t font-mono md:hidden ${BAND_RULE}`}>
        {steps.map((s) => (
          <details key={s.n} className={`group border-b ${BAND_RULE}`}>
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 py-3 text-[0.9375rem] font-semibold [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--background)]">
              <span className={`font-normal tabular-nums ${BAND_MUTED}`}>{s.n.padStart(2, "0")}</span>
              <span className="min-w-0 flex-1">{s.title}</span>
              <span aria-hidden="true" className={`shrink-0 font-normal ${BAND_MUTED}`}>
                <span className="group-open:hidden">+</span>
                <span className="hidden group-open:inline">−</span>
              </span>
            </summary>
            <p className={`pb-3 pl-9 text-[13px] leading-relaxed ${BAND_MUTED}`}>{s.body}</p>
            <TerminalLine cmd={s.cmd} className="pb-4 pl-9" />
          </details>
        ))}
      </div>
    </div>
  );
}

function TerminalLine({ cmd, className }: { cmd: string; className: string }) {
  return (
    <p className={`whitespace-pre-wrap break-words text-[13px] leading-relaxed ${className}`}>
      {isOutput(cmd) ? null : (
        <span aria-hidden="true" className={BAND_MUTED}>
          ${" "}
        </span>
      )}
      <code>{cmd}</code>
    </p>
  );
}

function CommandBlock({ title, cmd }: { title: string; cmd: string }) {
  return (
    <pre
      tabIndex={0}
      role="region"
      aria-label={`${title} command`}
      className="min-w-0 self-start overflow-x-auto whitespace-pre rounded-sm border border-border bg-card px-4 py-3 font-mono text-[13px] leading-relaxed text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
    >
      {cmd}
    </pre>
  );
}

function LedgerSteps({ steps, className }: { steps: readonly ProcedureStep[]; className: string }) {
  return (
    <div className={className}>
      <ol className="hidden border-t border-border md:block">
        {steps.map((s) => (
          <li
            key={s.n}
            className="grid gap-4 border-b border-border py-7 md:grid-cols-[3rem_minmax(0,1fr)_minmax(0,1.15fr)] md:gap-8"
          >
            <span className="display text-3xl leading-none text-muted-foreground">{s.n}</span>
            <div className="min-w-0">
              <h3 className="text-[1.0625rem] font-semibold">{s.title}</h3>
              <p className="mt-2 max-w-md leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
            <CommandBlock title={s.title} cmd={s.cmd} />
          </li>
        ))}
      </ol>

      <div className="border-t border-border md:hidden">
        {steps.map((s) => (
          <details key={s.n} className="group border-b border-border">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 py-3 font-semibold [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]">
              <span className="display w-5 text-xl font-normal leading-none text-muted-foreground">{s.n}</span>
              <span className="min-w-0 flex-1">{s.title}</span>
              <span aria-hidden="true" className="shrink-0 font-mono font-normal text-muted-foreground">
                <span className="group-open:hidden">+</span>
                <span className="hidden group-open:inline">−</span>
              </span>
            </summary>
            <p className="pb-3 pl-8 leading-relaxed text-muted-foreground">{s.body}</p>
            <div className="pb-4 pl-8 [&>pre]:min-w-0">
              <CommandBlock title={s.title} cmd={s.cmd} />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
