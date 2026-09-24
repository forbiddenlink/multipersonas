"use client";

import { PlanCheckoutButton } from "@/components/plan-checkout-button";

export function UnlockFoundingAccessButton({ className }: { className?: string }) {
  return (
    <PlanCheckoutButton
      className={className}
      endpoint="/api/checkout/founding"
      eventPrefix="founding_checkout"
      clickProperties={{ price_usd: 199, funnel_location: "agency_founding_section" }}
      signInHref="/auth/login?returnTo=%2Ffor-agencies%3Fcheckout%3Dready%23early-access"
      label="Unlock founding access — $199/mo"
    />
  );
}
