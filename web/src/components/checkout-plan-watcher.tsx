"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export const CHECKOUT_POLL_INTERVAL_MS = 4000;
export const CHECKOUT_POLL_MAX_ATTEMPTS = 15; // about 60 seconds

/**
 * Whether to ask the server for fresh data again. The Stripe webhook that grants the plan
 * can land a few seconds after the buyer returns, so we re-fetch for a bounded time and
 * then stop and hand over to the support copy.
 */
export function checkoutPollAction({
  paid,
  attempts,
  maxAttempts = CHECKOUT_POLL_MAX_ATTEMPTS,
}: {
  paid: boolean;
  attempts: number;
  maxAttempts?: number;
}): "done" | "poll" | "give-up" {
  if (paid) return "done";
  return attempts >= maxAttempts ? "give-up" : "poll";
}

/**
 * Shown after a successful checkout redirect. While the plan is still Free it refreshes the
 * server data every few seconds (up to ~60s) so the page flips to paid on its own, and
 * announces each state change through a polite live region.
 */
export function CheckoutPlanWatcher({ paid }: { paid: boolean }) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const action = checkoutPollAction({ paid, attempts });

  useEffect(() => {
    if (action !== "poll") return;
    const timer = setTimeout(() => {
      router.refresh();
      setAttempts((n) => n + 1);
    }, CHECKOUT_POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [action, attempts, router]);

  const message =
    action === "done"
      ? "Your account has paid access."
      : action === "poll"
        ? "Confirming your payment. This page updates on its own, no need to refresh."
        : "Your plan has not been updated yet. Refresh this page shortly. If you completed payment and access is still missing, contact billing support below before trying another checkout.";

  return (
    <p role="status" aria-live="polite" className="mt-3 text-sm text-muted-foreground">
      {message}
    </p>
  );
}
