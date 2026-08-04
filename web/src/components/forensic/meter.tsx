// CI-style fraction + thin progress bar. Every count/percentage is tabular-nums so
// digits never jitter. No glossy pie or percentage ring — a thin evidence bar only.
export function Meter({
  value,
  total,
  label,
  unit,
  tone = "teal",
  className = "",
}: {
  value: number;
  total: number;
  label: string;
  /** Trailing noun, e.g. "personas completed checkout". */
  unit?: string;
  tone?: "teal" | "critical" | "serious" | "moderate" | "minor" | "muted";
  className?: string;
}) {
  const pct = total > 0 ? Math.min(Math.max(value / total, 0), 1) : 0;
  const barColor =
    tone === "teal" ? "var(--primary)" : tone === "muted" ? "var(--muted-foreground)" : `var(--severity-${tone})`;
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="font-mono text-sm tabular-nums">
          {value}
          <span className="text-muted-foreground"> / {total}</span>
          {unit ? <span className="ml-1.5 text-xs text-muted-foreground">{unit}</span> : null}
        </span>
      </div>
      <div
        className="mt-1.5 h-1 overflow-hidden rounded-sm bg-border"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${label}: ${value} of ${total}`}
      >
        <div
          className="h-full rounded-sm transition-[width] duration-500 ease-out"
          style={{ width: `${Math.round(pct * 100)}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}
