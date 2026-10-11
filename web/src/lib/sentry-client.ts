// The only symbols the browser needs from the Sentry SDK. sentry-lazy.ts loads THIS module
// dynamically instead of "@sentry/nextjs" itself: a dynamic import of the package keeps
// every export alive (replay, feedback, integrations), which adds ~200KB gzip of unused
// async chunks. Re-exporting by name lets the bundler tree-shake the package as it did
// when it was imported statically.
export { init, captureException, captureRouterTransitionStart } from "@sentry/nextjs";
