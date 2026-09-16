"use client";

import type { ReactNode } from "react";
import { trackProductEvent } from "@/lib/analytics";

/**
 * The founding-tier CTA, wrapped only so the click is observable.
 *
 * Charges alone cannot tell "nobody looked" apart from "people looked and did not
 * buy", and those two failures point at opposite fixes. This click is the last step
 * of the funnel we can see before Stripe takes over, so it is the denominator the
 * demand test reads against. Navigation is a plain href: analytics must never sit
 * between someone and the checkout page.
 */
export function FoundingCheckoutLink({
  href,
  funnelLocation = "unknown",
  className,
  children,
}: {
  href: string;
  funnelLocation?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={() => trackProductEvent("founding_checkout_clicked", { price_usd: 199, funnel_location: funnelLocation })}
    >
      {children}
    </a>
  );
}
