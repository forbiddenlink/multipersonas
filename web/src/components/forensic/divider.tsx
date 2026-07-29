// Box-drawing divider — a subtle terminal/forensic section motif. Decorative only,
// so the drawing characters are aria-hidden; an optional label sits inline.
export function BoxDivider({
  label,
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 font-mono text-xs text-muted-foreground/60 ${className}`}
      aria-hidden="true"
    >
      <span className="select-none">└</span>
      <span className="h-px flex-1 bg-border" />
      {label ? (
        <>
          <span className="select-none tracking-wide">{label}</span>
          <span className="h-px flex-1 bg-border" />
        </>
      ) : null}
      <span className="select-none">┘</span>
    </div>
  );
}
