// Keyboard-nav dogfood: a small strip that invites "press Tab" and shows a thick, offset
// teal focus ring on every stop. Cheap, high-credibility — the product demonstrates the
// exact thing it audits. Pure markup; the browser's Tab order is the interaction.
// Buttons are inert demos (no handlers) so this stays a Server Component.
const STOPS = ["Scan URL", "Pick personas", "Read verdict", "Export report"];

export function FocusDemo({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <p className="mb-3 font-mono text-xs text-muted-foreground">
        <span className="select-none text-[var(--primary)]">›&nbsp;</span>
        press <kbd className="rounded-sm border border-border bg-card px-1.5 py-0.5">Tab</kbd> — every
        focus stop is visible by design
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Focus ring demonstration">
        {STOPS.map((label) => (
          <button
            key={label}
            type="button"
            aria-disabled="true"
            className="rounded-sm border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:border-[var(--primary)]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
