// Terminal-native loading state: a running-log line + a thin scan bar (forensic-terminal
// spec §6). The bar stays visible under reduced motion (only the pulse is motion-gated).
export default function Loading() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-full max-w-xs font-mono text-xs text-muted-foreground">
        <p>
          <span aria-hidden="true" className="select-none text-[var(--primary)]">›&nbsp;</span>
          scanning…
        </p>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-sm bg-border">
          <div
            className="h-full w-2/5 rounded-sm motion-safe:animate-pulse"
            style={{ backgroundColor: "var(--primary)" }}
          />
        </div>
      </div>
    </div>
  );
}
