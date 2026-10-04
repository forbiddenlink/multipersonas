// Wordmark — "Personaudit" set in the display serif, with a small redline check-tick
// struck through the final letter's baseline: the annotator's mark. The name reads
// as a signed document, not tool output.
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="size-[1.05em] shrink-0 text-[var(--redline)]"
        fill="none"
      >
        <rect x="1.5" y="1.5" width="17" height="17" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M5.5 10.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
      </svg>
      <span className="display text-[1.15em] leading-none font-semibold tracking-[-0.02em]">
        Personaudit
      </span>
    </span>
  );
}
