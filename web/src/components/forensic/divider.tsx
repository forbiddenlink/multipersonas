// Section divider — a label-mono eyebrow over a hairline rule, the same ledger-paper
// language as the rest of the app shell. Decorative only (no heading semantics), so
// it's aria-hidden; an optional label sits inline, ahead of the rule.
export function BoxDivider({
  label,
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-hidden="true">
      {label ? <span className="label-mono shrink-0">{label}</span> : null}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
