"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Queue a public grade, then land on `/grade/[token]` immediately. That page already
 * self-refreshes while queued/running — keeping the token only in-memory (and polling
 * here) meant a refresh mid-scan lost the result and burned another free-grade slot.
 */
export function GradeForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      const token = data.token as string | undefined;
      if (!token) {
        setError("Could not queue the grade. Please try again.");
        return;
      }

      router.push(`/grade/${token}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to connect to the server. Please try again.",
      );
    } finally {
      // Clear so a stalled navigation (or back/restore) doesn't leave a frozen spinner.
      // On a successful push the page unmounts anyway.
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          required
          disabled={loading}
          autoComplete="url"
          aria-label="Website URL to grade"
          className="h-10 flex-1 rounded-sm border border-border bg-card px-4 text-base text-foreground transition-colors duration-150 placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:opacity-50 md:text-sm"
        />
        <Button
          type="submit"
          size="lg"
          disabled={loading || !url}
          className="h-10 shrink-0 px-6 font-mono text-xs uppercase tracking-wide"
        >
          {loading ? "Grading…" : "Get my grade"}
        </Button>
      </form>

      {error && (
        <div role="alert" className="mt-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {loading && (
        <div
          role="status"
          aria-live="polite"
          className="mt-6 flex items-center gap-2.5 rounded-md border border-border bg-card px-4 py-3 font-mono text-sm text-muted-foreground"
        >
          <span
            className="size-1.5 shrink-0 rounded-full bg-[var(--primary)]"
            style={{ animation: "pulse 1.4s ease-in-out infinite" }}
            aria-hidden
          />
          <span>
            <span className="select-none text-[var(--primary)]">›&nbsp;</span>
            queued…
          </span>
        </div>
      )}
    </div>
  );
}
