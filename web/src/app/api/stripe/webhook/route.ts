import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { GRANT_RANK, PLANS, isPlanKey } from "@/lib/plans";

export const runtime = "nodejs";

function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

async function setPlan(userId: string, plan: "free" | "pro" | "team", customerId?: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client is not configured");
  const update = customerId ? { plan, stripe_customer_id: customerId } : { plan };
  const { data, error } = await admin.from("profiles").update(update).eq("id", userId).select("id").maybeSingle();
  if (error || !data) throw new Error("Could not persist subscription access");
}

async function syncPaidPlan(stripe: Stripe, userId: string, customerId: string): Promise<void> {
  // Webhooks can be retried or delivered out of order. Read current subscriptions
  // so an old cancellation cannot revoke a replacement subscription's access.
  // Keep the STRONGEST entitled grant rather than the first one seen: a customer who
  // upgrades solo -> founding briefly holds both, and stopping at the first match
  // could downgrade them to the tier they just left.
  let plan: "free" | "pro" | "team" = "free";
  for await (const subscription of stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })) {
    const entitled = subscription.status === "active" || subscription.status === "trialing";
    const key = subscription.metadata.personaudit_plan;
    if (entitled && isPlanKey(key) && subscription.metadata.supabase_user_id === userId) {
      const grant = PLANS[key].grants;
      if (GRANT_RANK[grant] > GRANT_RANK[plan]) plan = grant;
    }
  }
  await setPlan(userId, plan, customerId);
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
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const paymentComplete = session.payment_status === "paid" || session.payment_status === "no_payment_required";
      if (session.mode === "subscription" && paymentComplete && isPlanKey(session.metadata?.personaudit_plan) && userId && typeof session.customer === "string") {
        await syncPaidPlan(stripe, userId, session.customer);
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata.supabase_user_id;
      if (isPlanKey(subscription.metadata.personaudit_plan) && userId) {
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
        await syncPaidPlan(stripe, userId, customerId);
      }
    }
  } catch {
    // Stripe must retry when the entitlement was not saved. Do not expose billing data.
    return new Response("Could not persist subscription access", { status: 500 });
  }

  return Response.json({ received: true });
}
