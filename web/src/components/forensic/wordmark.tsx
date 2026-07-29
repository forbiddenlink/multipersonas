// Wordmark — "Person" in sans, "audit" in mono, with a teal cursor block. The mono
// shift + cursor is the small signature move: the brand name reads as tool output.
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline font-semibold tracking-tight ${className}`}>
      <span>Person</span>
      <span className="font-mono">audit</span>
      <span
        aria-hidden="true"
        className="ml-0.5 inline-block h-[0.95em] w-[0.5ch] translate-y-[0.08em] motion-safe:animate-pulse"
        style={{ backgroundColor: "var(--primary)" }}
      />
    </span>
  );
}
