import { afterLoadIdle } from "@/lib/idle";
import { captureClientError, captureRouterTransition, startSentry } from "@/lib/sentry-lazy";

// Client-side Sentry init. No-op until NEXT_PUBLIC_SENTRY_DSN is set (see instrumentation.ts).
// The SDK loads after the page has loaded (see lib/sentry-lazy.ts); until then uncaught
// errors are buffered by the listeners below and replayed once it is ready.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

function onError(event: ErrorEvent): void {
  captureClientError(event.error ?? event.message);
}

function onRejection(event: PromiseRejectionEvent): void {
  captureClientError(event.reason);
}

if (dsn && typeof window !== "undefined") {
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  afterLoadIdle(() =>
    startSentry(dsn, () => {
      // Sentry installs its own global handlers on init; drop the buffering ones.
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    }),
  );
}

export const onRouterTransitionStart = captureRouterTransition;
