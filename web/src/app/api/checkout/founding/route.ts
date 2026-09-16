import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function checkoutClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

export async function POST(): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return Response.json({ error: "Sign in before starting checkout." }, { status: 401 });
  }

  const stripe = checkoutClient();
  const price = process.env.STRIPE_FOUNDING_PRICE_ID;
  if (!stripe || !price) {
    return Response.json({ error: "Checkout is not available yet." }, { status: 503 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://personaudit.com";
  const metadata = { personaudit_plan: "founding", supabase_user_id: user.id };
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    line_items: [{ price, quantity: 1 }],
    metadata,
    subscription_data: { metadata },
    success_url: `${origin}/settings?checkout=success`,
    cancel_url: `${origin}/for-agencies?checkout=cancelled`,
  });

  if (!session.url) {
    return Response.json({ error: "Could not start checkout." }, { status: 502 });
  }
  return Response.json({ url: session.url });
}
