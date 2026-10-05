"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Button } from "@/components/ui/button";
import { safeAnalyticsHost, trackProductEvent } from "@/lib/analytics";
import { rememberGradeToken } from "@/lib/grade-tokens";
import { normalizeGradeInput, prefillFromSearch } from "@/lib/grade-url";

// Public site key is safe to expose (that's its purpose). When unset (local/preview),
// the widget is skipped and the server-side gate is a no-op, so the form behaves as before.
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

// How long the human check may stay unresolved before we say so and offer a retry.
const CHALLENGE_STALL_MS = 12_000;

function WaitSpinner() {
  return (
    <svg aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-30" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

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
  const waitId = `${inputId}-wait`;
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | undefined>(undefined);
  // The check can hang (blocked script, network) or report an error. Either way the
  // visitor gets a message and a Retry instead of a button that waits forever.
  const [challengeStalled, setChallengeStalled] = useState(false);
  const [challengeAttempt, setChallengeAttempt] = useState(0);
  // Cloudflare sometimes asks for a click (VPNs, privacy browsers). That is not a
  // stall: the visitor has a checkbox to tick, so no timer and no failure message.
  const [challengeNeedsClick, setChallengeNeedsClick] = useState(false);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || turnstileToken !== null || challengeNeedsClick) return;
    const timer = setTimeout(() => setChallengeStalled(true), CHALLENGE_STALL_MS);
    return () => clearTimeout(timer);
  }, [turnstileToken, challengeAttempt, challengeNeedsClick]);

  // "Re-grade this site" links here with ?url=<entry>. Read it after mount (keeps the
  // page statically rendered) and only fill an input the visitor has not touched.
  useEffect(() => {
    const prefill = prefillFromSearch(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time prefill from the address bar
    if (prefill) setUrl((current) => (current === "" ? prefill : current));
  }, []);

  function resetTurnstile() {
    setTurnstileToken(null);
    turnstileRef.current?.reset();
  }

  function retryChallenge() {
    setChallengeStalled(false);
    setChallengeNeedsClick(false);
    setChallengeAttempt((n) => n + 1);
    resetTurnstile();
  }

  // Only require a solved challenge when the widget is actually configured.
  const turnstileReady = !TURNSTILE_SITE_KEY || turnstileToken !== null;
  const showStalled = !turnstileReady && challengeStalled;
  const showNeedsClick = !turnstileReady && challengeNeedsClick && !challengeStalled;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedUrl = normalizeGradeInput(url);
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmedUrl);
    } catch {
      setError("Enter a website address, like example.com or https://example.com.");
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
        resetTurnstile();
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
    <div className="w-full">
      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        <label htmlFor={inputId} className="label-mono block">
          Public website URL
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={inputId}
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError(null);
            }}
            placeholder="your-client.com"
            required
            disabled={loading}
            autoComplete="url"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            className="h-12 min-w-0 sm:flex-1 rounded-sm border border-input bg-card px-4 font-mono text-base text-foreground transition-[border-color] duration-150 placeholder:text-muted-foreground hover:border-foreground/70 focus-visible:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] aria-invalid:border-[var(--redline)] disabled:cursor-not-allowed disabled:opacity-60"
          />
          {/* Waiting on the human check is not an inert button: keep full colour, show a
              spinner, and say why (aria-disabled keeps it focusable and described). */}
          <Button
            type="submit"
            size="lg"
            loading={loading}
            aria-disabled={!turnstileReady || undefined}
            aria-describedby={!turnstileReady ? waitId : undefined}
            onClick={!turnstileReady ? (e) => e.preventDefault() : undefined}
            className="h-12 shrink-0 px-6 aria-disabled:cursor-wait"
          >
            {!loading && !turnstileReady && !showStalled && !showNeedsClick ? <WaitSpinner /> : null}
            {loading
              ? "Queuing grade"
              : !turnstileReady && !showStalled && !showNeedsClick
                ? "Checking you\u2019re human\u2026"
                : "Grade this site"}
          </Button>
        </div>
        <p id={hintId} className="text-sm leading-relaxed text-muted-foreground">
          Up to 10 same-site public pages. Use the CLI for logged-in flows.
        </p>
        <p id={waitId} role="status" className="sr-only">
          {!turnstileReady
            ? showNeedsClick
              ? "Tick the \u201cVerify you are human\u201d box below, then grade."
              : "The Grade button unlocks once the human check below finishes."
            : ""}
        </p>
        <dl
          aria-label="What your free grade includes"
          className="grid grid-cols-1 gap-x-6 gap-y-1.5 border-t border-border pt-3 text-sm sm:grid-cols-3"
        >
          {[
            ["Grade", "A letter grade for the site"],
            ["Coverage", "The pages reached, listed"],
            ["Evidence", "Findings as named axe rules"],
          ].map(([term, detail]) => (
            <div key={term} className="min-w-0">
              <dt className="label-mono">{term}</dt>
              <dd className="mt-0.5 text-foreground">{detail}</dd>
            </div>
          ))}
        </dl>
        {showNeedsClick && (
          <p className="text-sm text-foreground">
            One more step: tick the \u201cVerify you are human\u201d box below, then press Grade.
          </p>
        )}
        {showStalled && (
          <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--redline)]">
            <p>
              <span aria-hidden="true" className="font-mono">■ </span>
              The human check did not finish. If it keeps failing, turn off script blockers for this page.
            </p>
            <button
              type="button"
              onClick={retryChallenge}
              className="text-link rounded-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Retry the human check
            </button>
          </div>
        )}
        {TURNSTILE_SITE_KEY && (
          <Turnstile
            ref={turnstileRef}
            siteKey={TURNSTILE_SITE_KEY}
            options={{ theme: "auto", size: "flexible" }}
            onSuccess={(token) => {
              setTurnstileToken(token);
              setChallengeStalled(false);
            }}
            onError={() => {
              setTurnstileToken(null);
              setChallengeStalled(true);
            }}
            onBeforeInteractive={() => {
              setChallengeNeedsClick(true);
              setChallengeStalled(false);
            }}
            onAfterInteractive={() => {
              setChallengeNeedsClick(false);
            }}
            onExpire={() => {
              setTurnstileToken(null);
              setChallengeStalled(false);
            }}
          />
        )}
      </form>

      {error && (
        <div id={errorId} role="alert" className="mt-3 flex gap-2 text-sm text-[var(--redline)]">
          <span aria-hidden="true" className="font-mono">■</span>
          <p>{error}</p>
        </div>
      )}

      {loading && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 flex items-center gap-2.5 font-mono text-sm text-muted-foreground"
        >
          <span
            className="size-1.5 shrink-0 rounded-full bg-[var(--primary)] motion-safe:animate-pulse"
            aria-hidden
          />
          <span>Opening your case file…</span>
        </div>
      )}
    </div>
  );
}
