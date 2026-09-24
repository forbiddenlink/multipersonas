"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { trackProductEvent } from "@/lib/analytics";

export type PlanCheckoutButtonProps = {
  /** POST target that returns { url } for a Stripe Checkout session. */
  endpoint: string;
  /** Analytics event prefix, e.g. "founding_checkout". Kept per-tier so one tier's
   *  funnel cannot be silently merged into another's. */
  eventPrefix: string;
  /** Extra properties on the initial click event only. */
  clickProperties?: Record<string, string | number | boolean>;
  /** Where an unauthenticated visitor is sent, returning to `?checkout=ready`. */
  signInHref: string;
  label: string;
  className?: string;
};

/**
 * Shared Stripe Checkout launcher. Every paid tier uses this so the sign-in bounce,
 * the resume-after-login path, and the error handling cannot drift between tiers.
 */
export function PlanCheckoutButton({
  endpoint,
  eventPrefix,
  clickProperties,
  signInHref,
  label,
  className,
}: PlanCheckoutButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signInRequired, setSignInRequired] = useState(false);
  // Held in a ref so a caller passing an inline object literal does not change
  // startCheckout's identity every render and re-arm the resume effect below.
  // Written in an effect, never during render.
  const clickPropertiesRef = useRef(clickProperties);
  useEffect(() => {
    clickPropertiesRef.current = clickProperties;
  }, [clickProperties]);

  const startCheckout = useCallback(async (resuming = false) => {
    setError(null);
    setSignInRequired(false);
    setLoading(true);
    if (!resuming) {
      trackProductEvent(`${eventPrefix}_clicked`, clickPropertiesRef.current ?? {});
    }
    try {
      const response = await fetch(endpoint, { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (response.status === 401) {
        trackProductEvent(`${eventPrefix}_auth_required`, { resuming });
        setSignInRequired(true);
        setLoading(false);
        return;
      }
      if (!response.ok) {
        trackProductEvent(`${eventPrefix}_failed`, {
          reason: "provider_error",
          status_code: response.status,
          resuming,
        });
        setError(body.error || "Could not start checkout.");
        setLoading(false);
        return;
      }
      if (!body.url) {
        trackProductEvent(`${eventPrefix}_failed`, {
          reason: "missing_checkout_url",
          status_code: response.status,
          resuming,
        });
        setError("Could not start checkout.");
        setLoading(false);
        return;
      }
      trackProductEvent(`${eventPrefix}_started`, { resuming });
      window.location.assign(body.url);
    } catch (cause) {
      trackProductEvent(`${eventPrefix}_failed`, { reason: "network_error", resuming });
      setError(cause instanceof Error ? cause.message : "Could not start checkout.");
      setLoading(false);
    }
  }, [endpoint, eventPrefix]);

  // The visitor already chose checkout before being asked to sign in. Resume that
  // explicit intent on the return trip instead of making them find this CTA again.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "ready") return;
    params.delete("checkout");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void startCheckout(true);
    });
    return () => { cancelled = true; };
  }, [startCheckout]);

  return (
    <div>
      <button type="button" className={className} onClick={() => void startCheckout()} disabled={loading}>
        {loading ? "Opening checkout…" : label}
      </button>
      {signInRequired ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          <a
            href={signInHref}
            className="rounded-sm text-foreground underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            Sign in or create an account to continue to checkout
          </a>
          . You&apos;ll return to this offer after signing in.
        </p>
      ) : null}
      {error ? <p role="alert" className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
