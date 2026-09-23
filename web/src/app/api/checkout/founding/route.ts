import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { isFoundingCheckoutOpen } from "@/lib/founding-checkout";

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

  if (!isFoundingCheckoutOpen()) {
    return Response.json({ error: "Checkout is not available yet." }, { status: 503 });
  }

  const stripe = checkoutClient();
  const price = process.env.STRIPE_FOUNDING_PRICE_ID;
  if (!stripe || !price) {
    return Response.json({ error: "Checkout is not available yet." }, { status: 503 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan,stripe_customer_id")
    .eq("id", user.id)
    .single();
  if (profileError || !profile || !["free", "pro", "team"].includes(profile.plan)) {
    return Response.json({ error: "Could not verify your current plan. Please try again." }, { status: 503 });
  }
  if (profile.plan !== "free") {
    return Response.json({ error: "Your account already has paid access. Contact billing support from Settings to change it." }, { status: 409 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://personaudit.com";
  const metadata = { personaudit_plan: "founding", supabase_user_id: user.id };
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(profile.stripe_customer_id ? { customer: profile.stripe_customer_id } : { customer_email: user.email }),
      line_items: [{ price, quantity: 1 }],
      metadata,
      subscription_data: { metadata },
      success_url: `${origin}/settings?checkout=success`,
      cancel_url: `${origin}/for-agencies?checkout=cancelled`,
    });
  } catch {
    return Response.json({ error: "Could not open checkout. Please try again shortly." }, { status: 503 });
  }

  if (!session.url) {
    return Response.json({ error: "Could not start checkout." }, { status: 502 });
  }
  return Response.json({ url: session.url });
}
