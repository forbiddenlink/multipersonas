import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

async function setPlan(userId: string, plan: "free" | "pro", customerId?: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client is not configured");
  const update = customerId ? { plan, stripe_customer_id: customerId } : { plan };
  await admin.from("profiles").update(update).eq("id", userId);
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.supabase_user_id;
    if (session.metadata?.personaudit_plan === "founding" && userId && typeof session.customer === "string") {
      await setPlan(userId, "pro", session.customer);
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata.supabase_user_id;
    if (subscription.metadata.personaudit_plan === "founding" && userId) {
      await setPlan(userId, subscription.status === "active" ? "pro" : "free");
    }
  }

  return Response.json({ received: true });
}
