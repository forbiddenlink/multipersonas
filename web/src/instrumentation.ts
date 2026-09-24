import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry-scrub";
import { isClientAbortedStream } from "@/lib/sentry-noise";

// Server + edge Sentry init. dsn comes from NEXT_PUBLIC_SENTRY_DSN; when it is unset
// (local dev, or before the env var is provisioned) Sentry.init with an undefined dsn
// is a documented no-op, so this ships safely disabled and activates the moment the
// DSN env var is set. next.config wraps with withSentryConfig for source-map upload; it
// COMPOSES the custom webpack fn (the @engine alias survives — verified by build), and the
// upload is a no-op unless SENTRY_AUTH_TOKEN/ORG/PROJECT are set in the build env. Errors
// are captured via onRequestError below plus captureException in the error boundaries.
export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      tracesSampleRate: 0.1,
      beforeSend: (event, hint) =>
        isClientAbortedStream(hint?.originalException) ? null : scrubEvent(event),
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
