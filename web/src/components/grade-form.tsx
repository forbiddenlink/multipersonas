"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Button } from "@/components/ui/button";
import { safeAnalyticsHost, trackProductEvent } from "@/lib/analytics";
import { rememberGradeToken } from "@/lib/grade-tokens";

// Public site key is safe to expose (that's its purpose). When unset (local/preview),
// the widget is skipped and the server-side gate is a no-op, so the form behaves as before.
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * Queue a public grade, then land on `/grade/[token]` immediately. That page already
 * self-refreshes while queued/running — keeping the token only in-memory (and polling
 * here) meant a refresh mid-scan lost the result and burned another free-grade slot.
 */
export function GradeForm() {
  const router = useRouter();
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | undefined>(undefined);

  function resetTurnstile() {
    setTurnstileToken(null);
    turnstileRef.current?.reset();
  }

  // Only require a solved challenge when the widget is actually configured.
  const turnstileReady = !TURNSTILE_SITE_KEY || turnstileToken !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedUrl = url.trim();
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmedUrl);
    } catch {
      setError("Enter a full URL, like https://example.com.");
      return;
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      setError("Use an http or https URL.");
      return;
    }

    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Please complete the verification below.");
      return;
    }

    setError(null);
    setLoading(true);
    trackProductEvent("grade_submit_started", {
      target_host: safeAnalyticsHost(parsedUrl.toString()),
      turnstile_configured: Boolean(TURNSTILE_SITE_KEY),
    });

    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: parsedUrl.toString(),
          turnstileToken: turnstileToken ?? undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        token?: string;
      };

      if (!res.ok) {
        // Turnstile tokens are single-use; force a re-solve after any rejection.
        resetTurnstile();
        setError(data.error || "Something went wrong");
        trackProductEvent("grade_submit_rejected", {
          status_code: res.status,
          turnstile_configured: Boolean(TURNSTILE_SITE_KEY),
        });
        return;
      }

      const token = data.token as string | undefined;
      if (!token) {
        setError("Could not queue the grade. Please try again.");
        trackProductEvent("grade_submit_rejected", { reason: "missing_token" });
        return;
      }

      trackProductEvent("grade_queued", {
        target_host: safeAnalyticsHost(parsedUrl.toString()),
        turnstile_configured: Boolean(TURNSTILE_SITE_KEY),
      });
      rememberGradeToken(token);
      router.push(`/grade/${token}`);
    } catch (err) {
      resetTurnstile();
      setError(
        err instanceof Error
          ? err.message
          : "Failed to connect to the server. Please try again.",
      );
      trackProductEvent("grade_submit_rejected", { reason: "network_error" });
    } finally {
      // Clear so a stalled navigation (or back/restore) doesn't leave a frozen spinner.
      // On a successful push the page unmounts anyway.
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        <label htmlFor={inputId} className="block font-mono text-xs uppercase tracking-wide text-muted-foreground">
          Public website URL
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id={inputId}
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError(null);
            }}
            placeholder="https://example.com"
            required
            disabled={loading}
            autoComplete="url"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            className="h-10 flex-1 rounded-sm border border-border bg-card px-4 text-base text-foreground transition-colors duration-150 placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:opacity-50 md:text-sm"
          />
          <Button
            type="submit"
            size="lg"
            disabled={loading || !url.trim() || !turnstileReady}
            className="h-10 shrink-0 px-6 font-mono text-sm uppercase tracking-wide"
          >
            {loading ? "Grading..." : "Get my grade"}
          </Button>
        </div>
        <p id={hintId} className="font-mono text-xs leading-relaxed text-muted-foreground">
          Public pages only. Use the CLI for logged-in flows.
        </p>
        {TURNSTILE_SITE_KEY && (
          <Turnstile
            ref={turnstileRef}
            siteKey={TURNSTILE_SITE_KEY}
            options={{ theme: "auto", size: "flexible" }}
            onSuccess={(token) => setTurnstileToken(token)}
            onError={() => setTurnstileToken(null)}
            onExpire={() => setTurnstileToken(null)}
          />
        )}
      </form>

      {error && (
        <div id={errorId} role="alert" className="mt-4 text-center">
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
            className="size-1.5 shrink-0 rounded-full bg-[var(--primary)] motion-safe:animate-pulse"
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
