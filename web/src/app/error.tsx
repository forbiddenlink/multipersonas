"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// On-brand error state: a case file stamped "unreadable", framed like every other
// dossier sheet. Dossier tokens only — this segment renders inside the root layout,
// so globals.css is already loaded (unlike global-error.tsx below it).
export default function Error({
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
    <main id="main" className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="file-tab ml-5">
          <span>Case unreadable</span>
        </div>
        <div className="sheet margin-rule relative -mt-px pb-8 pl-12 pr-6 pt-7 sm:pl-14 sm:pr-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label-mono">Something broke</p>
              <h1 className="display mt-2 text-[clamp(1.5rem,3.2vw,1.9rem)] leading-[1.1]">
                This page didn&apos;t load.
              </h1>
            </div>
            <span
              className="stamp shrink-0 text-[0.6rem]"
              aria-label="Verdict: unreadable"
            >
              Unreadable
            </span>
          </div>
          <p role="alert" className="mt-4 max-w-sm leading-relaxed text-muted-foreground">
            Try again. If this keeps happening, reload the page or contact support.
          </p>
          {error.digest ? (
            <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
              Reference: {error.digest}
            </p>
          ) : null}
          <div className="mt-7 border-t border-border pt-6">
            <button
              onClick={reset}
              className="inline-flex h-10 items-center justify-center rounded-sm bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[inset_0_-2px_0_oklch(0_0_0/0.18)] transition-colors duration-150 hover:bg-[color-mix(in_oklch,var(--primary)_86%,black)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
