"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [router, paused]);

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
