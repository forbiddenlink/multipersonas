// Live contrast badge — "4.8:1 AA ✓" beside a representative text sample. A cheap,
// high-credibility dogfood signal: the site states its own measured contrast.
export function ContrastBadge({
  ratio,
  level = "AA",
  className = "",
}: {
  ratio: string;
  level?: "AA" | "AAA";
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-2 py-0.5 font-mono text-xs tabular-nums ${className}`}
    >
      <span>{ratio}</span>
      <span className="text-muted-foreground">{level}</span>
      <span aria-hidden="true" style={{ color: "var(--primary)" }}>
        ✓
      </span>
      <span className="sr-only">passes {level}</span>
    </span>
  );
}
