"use client";

import { useCallback, useEffect, useState } from "react";
import { trackProductEvent } from "@/lib/analytics";

export function UnlockFoundingAccessButton({ className }: { className?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signInRequired, setSignInRequired] = useState(false);

  const startCheckout = useCallback(async (resuming = false) => {
    setError(null);
    setSignInRequired(false);
    setLoading(true);
    if (!resuming) {
      trackProductEvent("founding_checkout_clicked", { price_usd: 199, funnel_location: "agency_founding_section" });
    }
    try {
      const response = await fetch("/api/checkout/founding", { method: "POST" });
      const body = (await response.json()) as { url?: string; error?: string };
      if (response.status === 401) {
        setSignInRequired(true);
        setLoading(false);
        return;
      }
      if (!response.ok || !body.url) throw new Error(body.error || "Could not start checkout.");
      window.location.assign(body.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start checkout.");
      setLoading(false);
    }
  }, []);

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
        {loading ? "Opening checkout…" : "Unlock founding access — $199/mo"}
      </button>
      {signInRequired ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          <a
            href="/auth/login?returnTo=%2Ffor-agencies%3Fcheckout%3Dready%23early-access"
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
