import "server-only";
import { PLANS, type PlanKey } from "@/lib/plans";

/**
 * Shared credentials every checkout needs, independent of which price is being sold.
 * Presence only — this is a configuration gate, not proof that the Stripe account or
 * the webhook is healthy.
 */
function checkoutCredentialsPresent(): boolean {
  return [
    process.env.STRIPE_SECRET_KEY,
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ].every((value) => Boolean(value?.trim()));
}

/** True iff this plan's Stripe price is configured and the shared credentials exist. */
export function isPlanCheckoutOpen(plan: PlanKey): boolean {
  if (!checkoutCredentialsPresent()) return false;
  return Boolean(process.env[PLANS[plan].priceEnv]?.trim());
}

/** Configuration gate, not proof that the Stripe account or webhook is healthy. */
export function isFoundingCheckoutOpen(): boolean {
  // Preserve the existing explicit launch switch. Credentials alone must not
  // reopen an offer the operator has intentionally hidden.
  if (!process.env.NEXT_PUBLIC_FOUNDING_CHECKOUT_URL?.trim()) return false;
  return isPlanCheckoutOpen("founding");
}

/**
 * The solo tier has no separate launch switch: setting STRIPE_SOLO_PRICE_ID is the
 * switch, so the tier stays invisible until the Stripe price actually exists.
 */
export function isSoloCheckoutOpen(): boolean {
  return isPlanCheckoutOpen("solo");
}
