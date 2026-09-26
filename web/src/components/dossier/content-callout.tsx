import styles from "./content-prose.module.css";

/**
 * Two callout voices for long-form content:
 * - "redline": the annotator's margin note — a caveat, a correction, an honesty flag.
 * - "highlight": the highlighter block — the one sentence worth remembering.
 * Never used for a compliance verdict; those stay inside axe-cited findings.
 */
export function ContentCallout({
  variant = "redline",
  label,
  children,
}: {
  variant?: "redline" | "highlight";
  label?: string;
  children: React.ReactNode;
}) {
  if (variant === "highlight") {
    return (
      <div className={styles.calloutHighlight}>
        {label ? <p className="label-mono">{label}</p> : null}
        <div className={label ? "mt-2" : undefined}>{children}</div>
      </div>
    );
  }
  return (
    <div className={styles.calloutRedline}>
      <p className="redline-note uppercase tracking-[0.1em]">{label ?? "Note"}</p>
      <div className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}
