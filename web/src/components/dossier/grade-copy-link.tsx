"use client";

import { useCallback, useState } from "react";
import { trackProductEvent } from "@/lib/analytics";

/**
 * Copy the share link for this grade result. The token in the URL is the
 * capability — anyone holding it can view the read-only result, same model as
 * the embed badge and the "claim on signup" flow.
 */
export function GradeCopyLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = useCallback(() => {
    setError(null);
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/grade/${token}`
        : `https://personaudit.com/grade/${token}`;
    void (async () => {
      try {
        if (!navigator.clipboard) throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(url);
        setCopied(true);
        trackProductEvent("grade_link_copied", {});
        setTimeout(() => setCopied(false), 1800);
      } catch {
        setError("Could not copy. Copy the address bar link instead.");
      }
    })();
  }, [token]);

  return (
    <div>
      <button
        type="button"
        onClick={copy}
        className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-border bg-card px-4 text-sm text-foreground transition-colors duration-150 hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
      >
        <span aria-hidden="true" className="font-mono text-xs">⧉</span>
        {copied ? "Link copied" : "Copy share link"}
      </button>
      {/* Polite status so the copy is confirmed to screen readers, not only by the label swap. */}
      <span role="status" className="sr-only">
        {copied ? "Share link copied to clipboard" : ""}
      </span>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-[var(--redline)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
