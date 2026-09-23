import "server-only";

/** Configuration gate, not proof that the Stripe account or webhook is healthy. */
export function isFoundingCheckoutOpen(): boolean {
  // Preserve the existing explicit launch switch. Credentials alone must not
  // reopen an offer the operator has intentionally hidden.
  return [
    process.env.NEXT_PUBLIC_FOUNDING_CHECKOUT_URL,
    process.env.STRIPE_SECRET_KEY,
    process.env.STRIPE_FOUNDING_PRICE_ID,
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ].every((value) => Boolean(value?.trim()));
}
