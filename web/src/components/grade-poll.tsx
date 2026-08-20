"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/** Stop auto-refresh after this long. The worker's in-process cap is 5 minutes
 * and the reaper fires at 10; ten minutes of watching is past both, and matches
 * the signed-in audit poller. A "timeout" here means we stopped watching — the
 * job may still finish, which is why the manual refresh link stays. */
const POLL_DEADLINE_MS = 10 * 60 * 1000;

/**
 * Live status line for an in-progress grade.
 *
 * Replaces a `<meta http-equiv="refresh" content="5">` full-page reload, which is WCAG
 * 2.2.1 failure F5: an uncontrollable timed refresh that resets a screen-reader or
 * screen-magnifier user's reading position every few seconds. Instead this soft-refreshes
 * the server component via `router.refresh()` on an interval — no navigation, so scroll
 * and focus are preserved — and gives the user an explicit pause control (the 2.2.1
 * "turn off" mechanism). Without JS the interval never runs, and the manual "refresh now"
 * link remains as the graceful fallback for a shared/bookmarked link.
 *
 * The parent only renders this while status is queued/running, so once the grade
 * completes the component unmounts and the interval clears itself.
 */
export function GradePoll({ token }: { token: string }) {
  const router = useRouter();
  const [paused, setPaused] = useState(false);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (paused || stale) return;
    const started = Date.now();
    const id = setInterval(() => {
      if (Date.now() - started >= POLL_DEADLINE_MS) {
        setStale(true);
        return;
      }
      router.refresh();
    }, 5000);
    return () => clearInterval(id);
  }, [router, paused, stale]);

  if (stale) {
    return (
      <div
        role="status"
        className="mt-8 rounded-md border border-border bg-card px-4 py-4 font-mono text-sm text-muted-foreground"
      >
        <p className="text-foreground">This is taking longer than expected.</p>
        <p className="mt-1.5">
          The scan may still finish —{" "}
          <Link href={`/grade/${token}`} className="text-foreground underline underline-offset-4">
            refresh now
          </Link>
          , or{" "}
          <Link href="/grade" className="text-foreground underline underline-offset-4">
            try another URL
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-8 flex flex-wrap items-center gap-2.5 rounded-md border border-border bg-card px-4 py-3 font-mono text-sm text-muted-foreground"
    >
      <span
        className="size-1.5 shrink-0 rounded-full bg-[var(--primary)] motion-safe:animate-pulse"
        aria-hidden
      />
      still scanning — {paused ? "auto-refresh paused" : "updates automatically"}, or{" "}
      <Link href={`/grade/${token}`} className="text-foreground underline underline-offset-4">
        refresh now
      </Link>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        className="ml-auto rounded-sm px-2 py-1 text-xs underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
      >
        {paused ? "Resume auto-refresh" : "Pause auto-refresh"}
      </button>
    </div>
  );
}
