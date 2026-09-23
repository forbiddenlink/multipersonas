import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function billingClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return key ? new Stripe(key) : null;
}

/**
 * Opens Stripe's customer portal for an account that already has a customer id.
 * This does not prove the portal is enabled in the Stripe dashboard. A provider
 * failure stays generic so the Settings email path remains the fallback.
 */
export async function POST(): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Sign in before managing billing." }, { status: 401 });
  }

  const stripe = billingClient();
  if (!stripe) {
    return Response.json({ error: "Billing management is not available yet." }, { status: 503 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();
  const customerId = profile?.stripe_customer_id?.trim();
  if (profileError || !customerId) {
    return Response.json(
      { error: "This account has no Stripe billing record. Email billing support from Settings." },
      { status: 409 },
    );
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://personaudit.com";
  let session: Stripe.BillingPortal.Session;
  try {
    session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings`,
    });
  } catch {
    return Response.json({ error: "Could not open billing. Email billing support from Settings." }, { status: 503 });
  }

  if (!session.url) {
    return Response.json({ error: "Could not open billing." }, { status: 502 });
  }
  return Response.json({ url: session.url });
}
