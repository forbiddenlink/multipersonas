"use client";

import { PlanCheckoutButton } from "@/components/plan-checkout-button";

export function UnlockFoundingAccessButton({
  className,
  label = "Unlock founding access · $199/mo",
}: {
  className?: string;
  /** Where the price already sits beside the button (the pricing table), drop it from the label. */
  label?: string;
}) {
  return (
    <PlanCheckoutButton
      className={className}
      endpoint="/api/checkout/founding"
      eventPrefix="founding_checkout"
      clickProperties={{ price_usd: 199, funnel_location: "agency_founding_section" }}
      signInHref="/auth/login?returnTo=%2Ffor-agencies%3Fcheckout%3Dready%23early-access"
      label={label}
    />
  );
}
