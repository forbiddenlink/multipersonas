"use client";

import { PlanCheckoutButton } from "@/components/plan-checkout-button";

export function StartSoloPlanButton({ className }: { className?: string }) {
  return (
    <PlanCheckoutButton
      className={className}
      endpoint="/api/checkout/solo"
      eventPrefix="solo_checkout"
      clickProperties={{ price_usd: 39, funnel_location: "pricing_solo_tier" }}
      signInHref="/auth/login?returnTo=%2Fpricing%3Fcheckout%3Dready%23solo"
      label="Start Solo — $39/mo"
    />
  );
}
