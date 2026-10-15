import * as Sentry from "@sentry/nextjs";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { GRANT_RANK, PLANS, isPlanKey } from "@/lib/plans";
import { captureServerEvent } from "@/lib/analytics-server";

export const runtime = "nodejs";

function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

async function setPlan(
  userId: string,
  plan: "free" | "pro" | "team",
  customerId?: string,
  trialEndsAt: string | null = null,
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client is not configured");
  // trial_ends_at lets the spend path cap trialing callers lower (lib/spend.ts).
  const update = customerId
    ? { plan, stripe_customer_id: customerId, trial_ends_at: trialEndsAt }
    : { plan, trial_ends_at: trialEndsAt };
  let { data, error } = await admin.from("profiles").update(update).eq("id", userId).select("id").maybeSingle();
  // Deploy order: before migration 20261012120400 the column does not exist (Postgres 42703,
  // or PostgREST PGRST204 for an unknown column in the body). Entitlement must still be
  // saved, so retry without the trial marker rather than failing every subscription event.
  if (error && (error.code === "42703" || error.code === "PGRST204")) {
    const withoutTrial = customerId ? { plan, stripe_customer_id: customerId } : { plan };
    ({ data, error } = await admin.from("profiles").update(withoutTrial).eq("id", userId).select("id").maybeSingle());
  }
  if (error || !data) throw new Error("Could not persist subscription access");
}

async function syncPaidPlan(stripe: Stripe, userId: string, customerId: string): Promise<void> {
  // Webhooks can be retried or delivered out of order. Read current subscriptions
  // so an old cancellation cannot revoke a replacement subscription's access.
  // Keep the STRONGEST entitled grant rather than the first one seen: a customer who
  // upgrades solo -> founding briefly holds both, and stopping at the first match
  // could downgrade them to the tier they just left.
  let plan: "free" | "pro" | "team" = "free";
  let anyActive = false;
  let latestTrialEnd: number | null = null;
  for await (const subscription of stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })) {
    const entitled = subscription.status === "active" || subscription.status === "trialing";
    const key = subscription.metadata.personaudit_plan;
    if (entitled && isPlanKey(key) && subscription.metadata.supabase_user_id === userId) {
      const grant = PLANS[key].grants;
      if (GRANT_RANK[grant] > GRANT_RANK[plan]) plan = grant;
      if (subscription.status === "active") anyActive = true;
      else if (typeof subscription.trial_end === "number") {
        latestTrialEnd = Math.max(latestTrialEnd ?? 0, subscription.trial_end);
      }
    }
  }
  // Trialing only if nothing entitled is already paid; a paid subscription clears it.
  const trialEndsAt = !anyActive && latestTrialEnd !== null ? new Date(latestTrialEnd * 1000).toISOString() : null;
  await setPlan(userId, plan, customerId, trialEndsAt);
}

export async function POST(request: Request): Promise<Response> {
  const stripe = stripeClient();
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !signature || !secret) return new Response("Webhook unavailable", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    if (["checkout.session.completed", "checkout.session.expired", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed"].includes(event.type)) {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const attemptId = session.metadata?.personaudit_checkout_attempt;
      if (session.mode === "subscription" && isPlanKey(session.metadata?.personaudit_plan) && userId && attemptId && session.id) {
        const admin = createAdminClient();
        if (!admin) throw new Error("Admin client is not configured");
        // Recover a lost create response/write from signed Stripe evidence. A late
        // event must never overwrite a known session or another attempt's state.
        const { error } = await admin.from("checkout_attempts").update({ session_id: session.id })
          .eq("id", attemptId).eq("user_id", userId).is("session_id", null).select("id");
        if (error) throw new Error("Could not reconcile checkout session");
      }
    }
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const paymentComplete = session.payment_status === "paid" || session.payment_status === "no_payment_required";
      if (session.mode === "subscription" && paymentComplete && isPlanKey(session.metadata?.personaudit_plan) && userId && typeof session.customer === "string") {
        await syncPaidPlan(stripe, userId, session.customer);
        // Revenue was invisible in PostHog: the browser never sees the payment land.
        // Plan key only; no customer, email or amount. Stripe retries a delivery until it
        // gets a 2xx, so count these by unique stripe_event_id, not raw event count.
        await captureServerEvent(userId, "subscription_started", { plan: session.metadata?.personaudit_plan, stripe_event_id: event.id });
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata.supabase_user_id;
      if (isPlanKey(subscription.metadata.personaudit_plan) && userId) {
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
        await syncPaidPlan(stripe, userId, customerId);
        if (event.type === "customer.subscription.deleted") {
          await captureServerEvent(userId, "subscription_cancelled", { plan: subscription.metadata.personaudit_plan, stripe_event_id: event.id });
        }
      }
    }
  } catch (error) {
    // Tag only the event type and id. Never attach the event object: it carries customer and billing data.
    Sentry.captureException(error, { tags: { route: "stripe-webhook", event_type: event.type, event_id: event.id } });
    // Stripe must retry when the entitlement was not saved. Do not expose billing data.
    return new Response("Could not persist subscription access", { status: 500 });
  }

  return Response.json({ received: true });
}
