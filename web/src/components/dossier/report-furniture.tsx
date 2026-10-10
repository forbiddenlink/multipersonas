/**
 * Page furniture for the sample report sheet: a running header and a closing footer, like
 * the margins of a printed deliverable. This is one scrolling web page, so there is no
 * "Page X of Y" counter; the document number and the preparer line carry the role instead.
 * The number is a label for the sample, not an identifier of a real record.
 */
const DOC_NUMBER = "PA-0426-SAMPLE";

export function ReportRunningHeader({ host }: { host: string }) {
  return (
    <div className="-mt-1 mb-6 flex items-baseline justify-between gap-4 border-b border-border pb-2 font-mono text-[11px] uppercase leading-4 tracking-[0.1em] text-muted-foreground">
      <span>Doc {DOC_NUMBER}</span>
      <span className="truncate">{host}</span>
    </div>
  );
}

export function ReportFooter() {
  return (
    <footer className="mt-8 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border pt-3 font-mono text-[11px] uppercase leading-4 tracking-[0.1em] text-muted-foreground">
      <span>Prepared by Personaudit</span>
      <span>Doc {DOC_NUMBER}</span>
    </footer>
  );
}
