"use client";

import { useState } from "react";
import { trackProductEvent } from "@/lib/analytics";

export function UnlockFoundingAccessButton({ className }: { className?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    setError(null);
    setLoading(true);
    trackProductEvent("founding_checkout_clicked", { price_usd: 199, funnel_location: "agency_founding_section" });
    try {
      const response = await fetch("/api/checkout/founding", { method: "POST" });
      const body = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(body.error || "Could not start checkout.");
      window.location.assign(body.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start checkout.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" className={className} onClick={startCheckout} disabled={loading}>
        {loading ? "Opening checkout…" : "Unlock founding access — $199/mo"}
      </button>
      {error ? <p role="alert" className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
