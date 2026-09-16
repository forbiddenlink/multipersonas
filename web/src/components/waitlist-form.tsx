"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { trackProductEvent } from "@/lib/analytics";
import { composeWaitlistNote, readLeadAttribution } from "@/lib/waitlist-note";

type Status = "idle" | "submitting" | "success" | "already" | "error";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const SITE_BANDS = [
  { value: "", label: "How many client sites do you ship?" },
  { value: "1", label: "Just mine / one site" },
  { value: "2-5", label: "2–5 sites" },
  { value: "6-20", label: "6–20 sites" },
  { value: "20+", label: "20+ sites" },
] as const;

const AUTH_NEED_BANDS = [
  { value: "", label: "How many sit behind a login?" },
  { value: "none", label: "None — public sites only" },
  { value: "some", label: "Some of them" },
  { value: "most", label: "Most of them" },
  { value: "all", label: "All of them" },
] as const;

const SCAN_PREF_BANDS = [
  { value: "", label: "Where should those scans run?" },
  { value: "local", label: "Locally — password never leaves my machine" },
  { value: "hosted", label: "Hosted — I'd hand over a short-lived session" },
  { value: "unsure", label: "Not sure yet" },
] as const;

export function WaitlistForm() {
  const emailId = useId();
  const sitesId = useId();
  const authNeedId = useId();
  const scanPrefId = useId();
  const noteId = useId();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | undefined>(undefined);

  function resetTurnstile() {
    setTurnstileToken(null);
    turnstileRef.current?.reset();
  }

  const done = status === "success" || status === "already";
  const turnstileReady = !TURNSTILE_SITE_KEY || turnstileToken !== null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const authNeed = String(data.get("authNeed") || "") || undefined;
    const scanPref = String(data.get("scanPref") || "") || undefined;
    const attribution = readLeadAttribution(
      new URLSearchParams(window.location.search),
      document.referrer,
    );
    const payload = {
      email: String(data.get("email") || "").trim(),
      sitesCount: String(data.get("sitesCount") || "") || undefined,
      note: composeWaitlistNote({
        authNeed,
        scanPref,
        attribution,
        note: String(data.get("note") || ""),
      }),
      attribution,
      turnstileToken: turnstileToken ?? undefined,
    };

    if (!payload.email) {
      setError("Email is required.");
      setStatus("error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      setError("Enter a valid email address.");
      setStatus("error");
      return;
    }
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Please complete the verification check.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    trackProductEvent("waitlist_submit_started", {
      sites_count: payload.sitesCount,
      auth_need: authNeed,
      scan_pref: scanPref,
      acquisition_source: attribution.source,
      campaign: attribution.campaign,
      note_provided: Boolean(payload.note),
      turnstile_configured: Boolean(TURNSTILE_SITE_KEY),
    });

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Something went wrong. Please try again.");
        resetTurnstile();
        setStatus("error");
        trackProductEvent("waitlist_submit_rejected", {
          status_code: res.status,
          turnstile_configured: Boolean(TURNSTILE_SITE_KEY),
        });
        return;
      }
      setStatus(json.already ? "already" : "success");
      trackProductEvent(json.already ? "waitlist_already_joined" : "waitlist_joined", {
        sites_count: payload.sitesCount,
        auth_need: authNeed,
        scan_pref: scanPref,
        acquisition_source: attribution.source,
        campaign: attribution.campaign,
        note_provided: Boolean(payload.note),
      });
    } catch {
      setError("Network error. Please try again.");
      resetTurnstile();
      setStatus("error");
      trackProductEvent("waitlist_submit_rejected", { reason: "network_error" });
    }
  }

  if (done) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-md border border-border bg-card p-8"
      >
        <p className="font-heading text-2xl text-foreground">
          {status === "already" ? "You're already on the list." : "You're on the list."}
        </p>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          We&apos;re building the agency workspace with a handful of early partners. We&apos;ll
          reach out before it opens — and if you left a note, it goes straight into what we
          prioritise.
        </p>
        <p className="mt-5 text-sm">
          <Link
            href="/#scan"
            className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            Grade a public URL while you wait &rarr;
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div>
        <label
          htmlFor={emailId}
          className="block font-mono text-xs uppercase tracking-wide text-muted-foreground"
        >
          Work email
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@youragency.com"
          aria-describedby={error ? `${emailId}-err` : undefined}
          aria-invalid={status === "error" || undefined}
          className="mt-2 w-full rounded-sm border border-input bg-background px-4 py-3 text-base md:text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        />
      </div>

      <div>
        <label
          htmlFor={sitesId}
          className="block font-mono text-xs uppercase tracking-wide text-muted-foreground"
        >
          Scale{" "}
          <span className="normal-case font-sans text-muted-foreground">
            (optional, but it helps us prioritise)
          </span>
        </label>
        <select
          id={sitesId}
          name="sitesCount"
          defaultValue=""
          className="mt-2 w-full rounded-sm border border-input bg-background px-4 py-3 text-base md:text-sm outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        >
          {SITE_BANDS.map((b) => (
            <option key={b.value} value={b.value} disabled={b.value === ""}>
              {b.label}
            </option>
          ))}
        </select>
      </div>

      <details className="group border-y border-border py-3">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground marker:text-[var(--primary)] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]">
          Help us tailor the workspace <span className="font-normal">(optional)</span>
        </summary>
        <div className="mt-5 space-y-5">
          <div>
            <label htmlFor={authNeedId} className="block font-mono text-xs uppercase tracking-wide text-muted-foreground">
              Sites behind a login <span className="normal-case font-sans">(a no is as useful as a yes)</span>
            </label>
            <select id={authNeedId} name="authNeed" defaultValue="" className="mt-2 w-full rounded-sm border border-input bg-background px-4 py-3 text-base md:text-sm outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]">
              {AUTH_NEED_BANDS.map((b) => <option key={b.value} value={b.value} disabled={b.value === ""}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={scanPrefId} className="block font-mono text-xs uppercase tracking-wide text-muted-foreground">
              Scan preference <span className="normal-case font-sans">(optional)</span>
            </label>
            <select id={scanPrefId} name="scanPref" defaultValue="" className="mt-2 w-full rounded-sm border border-input bg-background px-4 py-3 text-base md:text-sm outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]">
              {SCAN_PREF_BANDS.map((b) => <option key={b.value} value={b.value} disabled={b.value === ""}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={noteId} className="block font-mono text-xs uppercase tracking-wide text-muted-foreground">
              Anything else <span className="normal-case font-sans">(optional)</span>
            </label>
            <textarea id={noteId} name="note" rows={2} maxLength={400} placeholder="e.g. mostly checkout and account dashboards" className="mt-2 w-full resize-y rounded-sm border border-input bg-background px-4 py-3 text-base md:text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]" />
          </div>
        </div>
      </details>

      {TURNSTILE_SITE_KEY && (
        <Turnstile
          ref={turnstileRef}
          siteKey={TURNSTILE_SITE_KEY}
          onSuccess={(token) => setTurnstileToken(token)}
          onError={() => setTurnstileToken(null)}
          onExpire={() => setTurnstileToken(null)}
          options={{ theme: "auto" }}
        />
      )}

      {error && (
        <p id={`${emailId}-err`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting" || !turnstileReady}
        className="inline-flex w-full items-center justify-center rounded-sm bg-foreground px-6 py-3.5 text-sm font-semibold text-background transition-[background-color,transform] hover:bg-foreground/90 active:translate-y-px disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] sm:w-auto"
      >
        {status === "submitting" ? "Sending…" : "Request founding access"}
      </button>

      <p className="text-xs text-muted-foreground">
        No spam, no overlay sales pitch. One email when founding access opens.
      </p>
    </form>
  );
}
