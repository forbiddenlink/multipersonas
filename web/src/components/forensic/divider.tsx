// Section divider: a label-mono title over a hairline rule, the same ledger-paper
// language as the rest of the app shell. A labelled divider titles a page section, so the
// label is a real <h2> that screen-reader users can reach by heading; only the rule is
// decorative. Without a label it is a pure rule and is hidden from assistive tech.
export function BoxDivider({
  label,
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-hidden={label ? undefined : true}>
      {label ? <h2 className="label-mono m-0 shrink-0 font-normal">{label}</h2> : null}
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
  );
}
