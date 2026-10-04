// App-shell loading state: a quiet blank sheet with a thin scan bar, matching the
// Evidence Dossier system (DESIGN.md) rather than a terminal spinner. The bar stays
// visible under reduced motion (only the pulse is motion-gated).
export default function Loading() {
  return (
    <div role="status" className="flex items-center justify-center py-16">
      <div className="sheet w-full max-w-xs px-5 py-4">
        <p className="label-mono">Loading</p>
        <div aria-hidden="true" className="mt-3 h-1 w-full overflow-hidden rounded-sm bg-border">
          <div
            className="h-full w-2/5 rounded-sm motion-safe:animate-pulse"
            style={{ backgroundColor: "var(--primary)" }}
          />
        </div>
      </div>
    </div>
  );
}
