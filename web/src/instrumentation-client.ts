import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry-scrub";

// Client-side Sentry init. No-op until NEXT_PUBLIC_SENTRY_DSN is set (see instrumentation.ts).
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: 0.1,
    beforeSend: (event) => scrubEvent(event),
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
