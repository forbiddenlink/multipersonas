import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry-scrub";

// Client-side Sentry init. No-op until NEXT_PUBLIC_SENTRY_DSN is set (see instrumentation.ts).
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    beforeSend: (event) => scrubEvent(event),
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
