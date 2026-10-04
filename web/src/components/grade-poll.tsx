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
export function GradePoll({
  token,
  status = "queued",
}: {
  token: string;
  status?: "queued" | "running";
}) {
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
      <div role="status" className="font-mono text-sm">
        <p className="redline-note uppercase tracking-[0.1em]">Taking longer than expected</p>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          The scan may still finish, or{" "}
          <Link href={`/grade/${token}`} className="text-link">
            refresh now
          </Link>
          , or{" "}
          <Link href="/grade" className="text-link">
            try another URL
          </Link>
          .
        </p>
      </div>
    );
  }

  const running = status === "running";
  const stages: { label: string; state: "done" | "current" | "todo" }[] = [
    { label: "Queued", state: running ? "done" : "current" },
    { label: "Crawling pages and running axe-core", state: running ? "current" : "todo" },
    { label: "Writing the grade", state: "todo" },
  ];

  return (
    <div>
      <p className="label-mono">Scanning</p>
      <div className="mt-3 border-t-2 border-foreground pt-5">
        {/* Only the sentence that changes with real job state is a live region. */}
        <p role="status" aria-live="polite" className="font-mono text-sm">
          {running
            ? "Your scan is running: crawling public pages and running axe-core on each."
            : "Your scan is queued and will start as soon as a worker is free."}
        </p>
        <ol className="mt-4 space-y-2 font-mono text-sm">
          {stages.map((stage) => (
            <li
              key={stage.label}
              aria-current={stage.state === "current" ? "step" : undefined}
              className={`flex items-center gap-2.5 ${stage.state === "todo" ? "text-muted-foreground" : "text-foreground"}`}
            >
              <span
                aria-hidden
                className={`size-2 shrink-0 rounded-full ${
                  stage.state === "current"
                    ? "bg-[var(--primary)] motion-safe:animate-pulse"
                    : stage.state === "done"
                      ? "bg-foreground"
                      : "border border-muted-foreground"
                }`}
              />
              <span>{stage.label}</span>
              <span className="sr-only">
                {stage.state === "done" ? "(done)" : stage.state === "current" ? "(in progress)" : "(not started)"}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Up to 10 public pages are scanned. This page keeps its address, so you can leave
          and come back to the result.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-4">
          <p className="font-mono text-sm text-muted-foreground">
            {paused ? "Auto-refresh paused" : "Updates automatically"}, or{" "}
            <Link href={`/grade/${token}`} className="text-link">
              refresh now
            </Link>
          </p>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="ml-auto inline-flex min-h-11 items-center rounded-sm px-3 font-mono text-xs text-muted-foreground underline decoration-dotted underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            {paused ? "Resume auto-refresh" : "Pause auto-refresh"}
          </button>
        </div>
      </div>
    </div>
  );
}
