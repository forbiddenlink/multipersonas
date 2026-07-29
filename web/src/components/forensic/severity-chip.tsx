import { severityMeta } from "./severity";

// Severity chip — color + icon + text, always all three. Optional tabular rule id
// (e.g. "1.4.3") sits in a mono slot so ids align in a column.
export function SeverityChip({
  severity,
  ruleId,
  className = "",
}: {
  severity: string;
  ruleId?: string;
  className?: string;
}) {
  const meta = severityMeta(severity);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium ${className}`}
      style={{
        // Severity token as text is WCAG-AA on the theme background (verified in the token
        // spec). No fill tint — a faint tint lowers that contrast below AA, so the chip is
        // an outline chip: colored border + glyph + text on the surface behind it.
        color: meta.token,
        borderColor: `color-mix(in oklch, ${meta.token} 55%, transparent)`,
      }}
    >
      <span aria-hidden="true" className="text-[0.7em] leading-none">
        {meta.glyph}
      </span>
      {meta.label}
      {ruleId ? (
        <span className="ml-0.5 font-mono tabular-nums">{ruleId}</span>
      ) : null}
    </span>
  );
}
