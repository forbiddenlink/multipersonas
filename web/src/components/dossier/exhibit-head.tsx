/**
 * Opens a section as a numbered exhibit: an ink file tab on a 2px rule, with a Bates-style
 * serial at the far end. The letter and serial are CSS counters scoped to `<main
 * className="exhibits">`, so a page numbers its own exhibits in order. See DESIGN.md.
 */
export function ExhibitHead({
  label,
  className = "",
  headingId,
}: {
  label: string;
  className?: string;
  /**
   * Render the tab as the section's `<h2>` with this id (the target of the section's
   * `aria-labelledby`). Use it instead of a separate sr-only heading, which made screen
   * readers announce the same words twice.
   */
  headingId?: string;
}) {
  return (
    <div className={`exhibit-head ${className}`}>
      {headingId ? (
        <h2 id={headingId} className="exhibit-tab">
          {label}
        </h2>
      ) : (
        <p className="exhibit-tab">{label}</p>
      )}
      <span className="exhibit-serial" aria-hidden="true" />
    </div>
  );
}

/** A Bates-style serial for a sheet-shaped object. Decoration only: it never claims a count. */
export function BatesSerial({ n, className = "" }: { n: string; className?: string }) {
  return (
    <span className={`bates ${className}`} aria-hidden="true">
      PA-0426-{n}
    </span>
  );
}
