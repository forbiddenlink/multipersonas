import * as Sentry from "@sentry/nextjs";

// Server + edge Sentry init. dsn comes from NEXT_PUBLIC_SENTRY_DSN; when it is unset
// (local dev, or before the env var is provisioned) Sentry.init with an undefined dsn
// is a documented no-op, so this ships safely disabled and activates the moment the
// DSN env var is set. No withSentryConfig wrapper on purpose — it would rewrite the
// custom webpack config (the @engine alias). Errors are captured via onRequestError
// below plus captureException in the error boundaries.
export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({ dsn, tracesSampleRate: 0.1 });
  }
}

export const onRequestError = Sentry.captureRequestError;
