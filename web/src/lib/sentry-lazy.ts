import type * as SentryModule from "@/lib/sentry-client";
import { scrubEvent, scrubTransaction, sharedReportSafeSampler } from "@/lib/sentry-scrub";
import { isInjectedEvalError } from "@/lib/sentry-noise";

// The Sentry browser SDK is ~150KB gzip and nothing above the fold needs it, so it is
// imported after the page has loaded instead of ahead of hydration. Errors reported before
// it is ready are buffered and replayed once it initialises: delayed, not dropped.
let sentry: typeof SentryModule | undefined;
const pending: unknown[] = [];
const MAX_PENDING = 10;

/** Report an error now if Sentry is ready, otherwise queue it for when it is. */
export function captureClientError(error: unknown): void {
  if (sentry) sentry.captureException(error);
  else if (pending.length < MAX_PENDING) pending.push(error);
}

export function captureRouterTransition(
  ...args: Parameters<typeof SentryModule.captureRouterTransitionStart>
): void {
  sentry?.captureRouterTransitionStart(...args);
}

export function startSentry(dsn: string, onReady?: () => void): void {
  void import("@/lib/sentry-client").then((Sentry) => {
    Sentry.init({
      dsn,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      tracesSampler: sharedReportSafeSampler(0.1),
      beforeSendTransaction: (event) => scrubTransaction(event),
      beforeSend: (event) => (isInjectedEvalError(event) ? null : scrubEvent(event)),
    });
    sentry = Sentry;
    onReady?.();
    for (const error of pending.splice(0)) Sentry.captureException(error);
  });
}
