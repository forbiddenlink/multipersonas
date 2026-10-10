/**
 * Run `fn` once the page has finished loading and the main thread is idle. Third-party and
 * auth SDKs that nothing above the fold needs go through this so they do not compete with
 * hydration for first paint. Browser-only: callers must already be on the client.
 */
export function afterLoadIdle(fn: () => void, timeoutMs = 3000): void {
  const run = () => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(fn, { timeout: timeoutMs });
    } else {
      setTimeout(fn, 1);
    }
  };
  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
}
