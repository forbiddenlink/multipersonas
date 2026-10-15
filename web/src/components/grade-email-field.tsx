"use client";

import { useId, useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Button } from "@/components/ui/button";
import { trackProductEvent } from "@/lib/analytics";
import { normalizeGradeEmail } from "@/lib/grade-email";
import { useGradeEmailEnabled } from "@/lib/use-grade-email-enabled";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const INPUT_CLASS =
  "h-11 min-w-0 rounded-sm border border-input bg-card px-3 font-mono text-base text-foreground transition-[border-color] duration-150 placeholder:text-muted-foreground hover:border-foreground/70 focus-visible:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] aria-invalid:border-[var(--redline)] disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Optional address box inside the grade form. Renders nothing unless the server reports
 * that it can send; the free grade never depends on it. The form owns the value and
 * submits it with the grade request (which already passes the Turnstile check).
 */
export function GradeEmailField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const enabled = useGradeEmailEnabled();
  const id = useId();
  if (!enabled) return null;
  return (
    <div>
      <label htmlFor={id} className="label-mono block">
        Email me this grade <span className="text-muted-foreground">(optional)</span>
      </label>
      <input
        id={id}
        type="email"
        inputMode="email"
        autoComplete="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="you@example.com"
        aria-describedby={`${id}-hint`}
        className={`mt-2 w-full sm:max-w-sm ${INPUT_CLASS}`}
      />
      <p id={`${id}-hint`} className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        Leave it blank to just watch the result here. If you add it, we send one email when the
        grade finishes, then delete the address.
      </p>
    </div>
  );
}

/**
 * Stand-alone capture for a grade that is already queued or running, so a visitor can leave.
 * Posts to /api/grade/email with its own human check (a token is single use, so the one the
 * grade form solved cannot be reused here).
 */
export function GradeEmailCapture({ token }: { token: string }) {
  const enabled = useGradeEmailEnabled();
  const id = useId();
  const [email, setEmail] = useState("");
  const [armed, setArmed] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!enabled) return null;

  if (done) {
    return (
      <div className="mt-4 border-t border-border pt-4">
        <p role="status" className="font-mono text-sm">
          Saved. We will send one email when this grade finishes, then delete your address.
        </p>
      </div>
    );
  }

  const turnstileReady = !TURNSTILE_SITE_KEY || turnstileToken !== null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeGradeEmail(email);
    if (!normalized) {
      setError("Enter a valid email address.");
      return;
    }
    if (!turnstileReady) {
      setError("Please complete the verification below.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/grade/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email: normalized, turnstileToken: turnstileToken ?? undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; status?: string };
      if (!res.ok) {
        setTurnstileToken(null);
        turnstileRef.current?.reset();
        setError(data.error || "Could not save your email. Please try again.");
        return;
      }
      // Event names the surface only. The address never goes to analytics.
      trackProductEvent("grade_email_requested", { surface: "poll", outcome: data.status ?? "saved" });
      setDone(true);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      onFocusCapture={() => setArmed(true)}
      className="mt-4 space-y-2 border-t border-border pt-4"
    >
      <label htmlFor={id} className="label-mono block">
        Rather not wait? Email me this grade
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          disabled={busy}
          placeholder="you@example.com"
          aria-describedby={`${id}-hint`}
          aria-invalid={error ? true : undefined}
          className={`sm:w-72 ${INPUT_CLASS}`}
        />
        <Button type="submit" size="lg" loading={busy} className="h-11 shrink-0">
          Email me
        </Button>
      </div>
      <p id={`${id}-hint`} className="text-sm leading-relaxed text-muted-foreground">
        One email when it finishes, then we delete the address. This page keeps working either way.
      </p>
      {TURNSTILE_SITE_KEY && armed && (
        <Turnstile
          ref={turnstileRef}
          siteKey={TURNSTILE_SITE_KEY}
          options={{ theme: "auto", size: "flexible" }}
          onSuccess={(t) => setTurnstileToken(t)}
          onError={() => setTurnstileToken(null)}
          onExpire={() => setTurnstileToken(null)}
        />
      )}
      {error && (
        <p role="alert" className="flex gap-2 text-sm text-[var(--redline)]">
          <span aria-hidden="true" className="font-mono">■</span>
          {error}
        </p>
      )}
    </form>
  );
}
