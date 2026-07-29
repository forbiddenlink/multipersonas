"use client";

// Terminal-native error state: a `fail` line in the critical severity colour with a
// retry prompt, framed as tool output (forensic-terminal spec §6).
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-md border border-border bg-card font-mono text-sm">
        <div className="border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
          <span aria-hidden="true" className="select-none text-[var(--primary)]">┌─ </span>
          personaudit ~/error
        </div>
        <div className="space-y-3 px-4 py-5">
          <p style={{ color: "var(--severity-critical)" }}>
            <span aria-hidden="true" className="select-none">✗&nbsp;</span>
            fail — something broke
          </p>
          <p className="break-words text-muted-foreground">
            {error.message ||
              "Try refreshing the page. If this keeps happening, clear your browser cache."}
          </p>
          <button
            onClick={reset}
            className="rounded-sm border border-border px-3 py-1.5 text-left transition-colors hover:border-[var(--primary)]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            <span aria-hidden="true" className="select-none text-[var(--primary)]">›&nbsp;</span>
            retry
          </button>
        </div>
      </div>
    </div>
  );
}
