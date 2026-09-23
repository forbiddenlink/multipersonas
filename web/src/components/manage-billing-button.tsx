"use client";

import { useState } from "react";
import { trackProductEvent } from "@/lib/analytics";

export function ManageBillingButton() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function openBilling() {
    setError(null);
    setLoading(true);
    trackProductEvent("billing_portal_clicked");
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !body.url) {
        trackProductEvent("billing_portal_failed", {
          reason: response.ok ? "missing_portal_url" : "provider_error",
          status_code: response.status,
        });
        setError(body.error || "Could not open billing.");
        setLoading(false);
        return;
      }
      trackProductEvent("billing_portal_started");
      window.location.assign(body.url);
    } catch {
      trackProductEvent("billing_portal_failed", { reason: "network_error" });
      setError("Could not open billing.");
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => void openBilling()}
        disabled={loading}
        className="inline-flex items-center justify-center rounded-sm border border-border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors hover:border-foreground/20 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:opacity-50"
      >
        {loading ? "Opening billing…" : "Manage billing"}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
