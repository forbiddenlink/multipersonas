"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import Link from "next/link";
import { useId, useRef, useState } from "react";

type Status = "idle" | "submitting" | "success" | "already" | "error";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const SITE_BANDS = [
  { value: "", label: "How many client sites do you ship?" },
  { value: "1", label: "Just mine / one site" },
  { value: "2-5", label: "2–5 sites" },
  { value: "6-20", label: "6–20 sites" },
  { value: "20+", label: "20+ sites" },
] as const;

export function WaitlistForm() {
  const emailId = useId();
  const sitesId = useId();
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
    const payload = {
      email: String(data.get("email") || "").trim(),
      sitesCount: String(data.get("sitesCount") || "") || undefined,
      note: String(data.get("note") || "").trim() || undefined,
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
        return;
      }
      setStatus(json.already ? "already" : "success");
    } catch {
      setError("Network error. Please try again.");
      resetTurnstile();
      setStatus("error");
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
            href="/"
            className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            Try the free scan while you wait &rarr;
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

      <div>
        <label
          htmlFor={noteId}
          className="block font-mono text-xs uppercase tracking-wide text-muted-foreground"
        >
          What would make this a no-brainer for you?{" "}
          <span className="normal-case font-sans text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id={noteId}
          name="note"
          rows={3}
          maxLength={500}
          placeholder="e.g. one report I can white-label per client, scheduled monthly re-scans, a CI check my devs can't ignore…"
          className="mt-2 w-full resize-y rounded-sm border border-input bg-background px-4 py-3 text-base md:text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        />
      </div>

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
        {status === "submitting" ? "Joining…" : "Get early access"}
      </button>

      <p className="text-xs text-muted-foreground">
        No spam, no overlay sales pitch. One email when the agency workspace opens.
      </p>
    </form>
  );
}
