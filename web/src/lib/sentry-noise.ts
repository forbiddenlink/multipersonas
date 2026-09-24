/**
 * Next.js logs `The destination stream closed early.` whenever a client stops
 * reading an RSC payload mid-flight. Every server action that ends in
 * `redirect()` does exactly that: the browser follows the redirect and abandons
 * the original POST's stream. Saving a project task, a schedule, an agency name
 * or cancelling a checkout all produce it, once per submit.
 *
 * It is a client disconnect, not a fault: the action already committed, and
 * there is nothing to fix or page anyone about. `onRequestError` in
 * instrumentation.ts reports every server error to Sentry, so left alone this
 * becomes the highest-volume issue in the project the moment real people start
 * using it. Today it is invisible only because almost nobody does.
 *
 * Matched narrowly, on Next's exact wording, so a genuine stream failure with
 * any other message still reports.
 */
const CLIENT_ABORTED_STREAM = "The destination stream closed early.";

export function isClientAbortedStream(error: unknown): boolean {
  if (!error) return false;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : typeof (error as { message?: unknown }).message === "string"
          ? (error as { message: string }).message
          : "";
  return message.trim() === CLIENT_ABORTED_STREAM;
}
