"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// In-app error state: a calm sheet in the Evidence Dossier language (DESIGN.md)
// rather than a terminal error dump.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center px-4 py-16">
      <div className="sheet w-full max-w-md px-5 py-6">
        <p className="label-mono" style={{ color: "var(--severity-critical)" }}>
          <span aria-hidden="true">■ </span>
          Something broke
        </p>
        <p className="mt-3 break-words text-sm leading-relaxed text-muted-foreground">
          {error.message ||
            "Try refreshing the page. If this keeps happening, clear your browser cache."}
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-sm border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
