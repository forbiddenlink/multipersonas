"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Phase = "idle" | "queued" | "running";

/** Poll the grade until it reaches a terminal state (completed/failed) or a client-side
 * deadline passes. Mirrors audit-form's pollAuditJob: a transient network blip must not
 * freeze the UI, and a "timed out watching" outcome is not the same as "job died" — the
 * worker keeps running regardless, so the result page (which can self-refresh) is a safe
 * place to land either way. */
async function pollGradeUntilTerminal(
  token: string,
  onPhase: (phase: Phase) => void,
): Promise<void> {
  const deadlineMs = Date.now() + 3 * 60 * 1000;
  while (Date.now() < deadlineMs) {
    await new Promise((r) => setTimeout(r, 3000));
    let data: { status?: string };
    try {
      const res = await fetch(`/api/grade/${token}`);
      if (!res.ok) continue; // transient — keep polling, don't freeze the spinner
      data = await res.json();
    } catch {
      // Offline blip / dropped connection — the scan is still running server-side.
      continue;
    }
    if (data.status === "running") onPhase("running");
    if (data.status === "completed" || data.status === "failed") return;
  }
}

export function GradeForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setPhase("queued");

    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        setPhase("idle");
        return;
      }

      const token = data.token as string | undefined;
      if (!token) {
        setError("Could not queue the grade. Please try again.");
        setLoading(false);
        setPhase("idle");
        return;
      }

      // The scan runs in a worker; poll until it settles (or the client gives up
      // watching), then land on the result page either way — it knows how to render
      // queued/running/completed/failed on its own.
      await pollGradeUntilTerminal(token, setPhase);
      router.push(`/grade/${token}`);
    } catch (err) {
      setLoading(false);
      setPhase("idle");
      setError(
        err instanceof Error
          ? err.message
          : "Failed to connect to the server. Please try again.",
      );
    }
  }

  const statusLabel =
    phase === "running" ? "scanning public pages…" : phase === "queued" ? "queued…" : "";

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
        <div className="mt-4 text-center">
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
            {statusLabel || "starting…"}
          </span>
        </div>
      )}
    </div>
  );
}
