import "server-only";
import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/server";
import { isFoundingCheckoutOpen, isPlanCheckoutOpen } from "@/lib/founding-checkout";
import { PLANS, trialPeriodDays, type PlanKey } from "@/lib/plans";
import { siteOrigin } from "@/lib/site-url";

function checkoutClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

/** The founding offer keeps its explicit launch switch; other plans gate on their price id. */
function offerOpen(plan: PlanKey): boolean {
  return plan === "founding" ? isFoundingCheckoutOpen() : isPlanCheckoutOpen(plan);
}

/** Retain a reservation until Stripe proves its session can no longer charge. */
async function openReservedCheckout(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  stripe: Stripe,
  userId: string,
  plan: PlanKey,
  params: Stripe.Checkout.SessionCreateParams,
): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const inserted = await admin.from("checkout_attempts").insert({
      user_id: userId,
      id: randomUUID(),
      plan,
      params: JSON.parse(JSON.stringify(params)) as Json,
    }).select("*").single();
    if (inserted.error && inserted.error.code !== "23505") throw inserted.error;
    const stored = inserted.data ? inserted : await admin.from("checkout_attempts")
      .select("*").eq("user_id", userId).single();
    if (stored.error || !stored.data) throw new Error("Checkout reservation unavailable");
    const reservation = stored.data;
    let session: Stripe.Checkout.Session;
    if (reservation.session_id) {
      session = await stripe.checkout.sessions.retrieve(reservation.session_id);
    } else {
      if (reservation.plan !== plan) {
        return Response.json({ error: "Another checkout is already being prepared for your account. Please retry that checkout." }, { status: 409 });
      }
      const frozen = reservation.params as unknown as Stripe.Checkout.SessionCreateParams;
      // Stripe may prune idempotency keys after 24 hours. Never retry an unknown
      // outcome past that window or let a late retry extend the session lifetime.
      if (Date.now() - Date.parse(reservation.created_at) >= 23 * 60 * 60 * 1000 ||
          typeof frozen.expires_at !== "number" || frozen.expires_at <= Date.now() / 1000 + 31 * 60) {
        return Response.json({ error: "This checkout needs billing support before another can be opened." }, { status: 503 });
      }
      const metadata = { ...frozen.metadata, personaudit_checkout_attempt: reservation.id };
      session = await stripe.checkout.sessions.create({ ...frozen, metadata }, {
        idempotencyKey: `checkout-${reservation.id}`,
      });
      if (!session.id) throw new Error("Checkout session unavailable");
      const saved = await admin.from("checkout_attempts").update({ session_id: session.id })
        .eq("id", reservation.id).eq("user_id", userId).select("id").single();
      if (saved.error || !saved.data) throw new Error("Checkout session persistence failed");
    }
    if (session.metadata?.supabase_user_id !== userId ||
        session.metadata.personaudit_checkout_attempt !== reservation.id) {
      throw new Error("Checkout session ownership mismatch");
    }
    let retired = session.status === "expired";
    if (session.status === "complete" && session.subscription) {
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      retired = subscription.status === "canceled" || subscription.status === "incomplete_expired";
    }
    if (retired) {
      const removed = await admin.from("checkout_attempts").delete()
        .eq("id", reservation.id).eq("user_id", userId).eq("session_id", session.id).select("id");
      if (removed.error) throw removed.error;
      continue;
    }
    if (session.status === "complete") {
      return Response.json({ error: "Your checkout is already complete. Wait for billing confirmation before trying again." }, { status: 409 });
    }
    if (reservation.plan !== plan) {
      return Response.json({ error: "A checkout for another plan is already open. Finish it or wait for it to expire before changing plans." }, { status: 409 });
    }
    if (session.status !== "open" || !session.url) throw new Error("Checkout session unavailable");
    return Response.json({ url: session.url });
  }
  throw new Error("Checkout reservation changed; retry");
}

/**
 * Open a Stripe Checkout session for one paid plan. Shared by every /api/checkout/*
 * route so the sign-in gate, the already-paid guard, and the metadata contract cannot
 * drift between tiers.
 */
export async function startPlanCheckout(plan: PlanKey): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return Response.json({ error: "Sign in before starting checkout." }, { status: 401 });
  }

  if (!offerOpen(plan)) {
    return Response.json({ error: "Checkout is not available yet." }, { status: 503 });
  }

  const stripe = checkoutClient();
  const price = process.env[PLANS[plan].priceEnv];
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

  const origin = siteOrigin();
  const metadata = { personaudit_plan: plan, supabase_user_id: user.id };
  const trialDays = trialPeriodDays();
  const admin = createAdminClient();
  if (!admin) return Response.json({ error: "Checkout is not available yet." }, { status: 503 });
  try {
    return await openReservedCheckout(admin, stripe, user.id, plan, {
      mode: "subscription",
      // Fixed lifetime also bounds recovery after an ambiguous create response.
      expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60 - 60,
      ...(profile.stripe_customer_id ? { customer: profile.stripe_customer_id } : { customer_email: user.email }),
      line_items: [{ price, quantity: 1 }],
      metadata,
      subscription_data: {
        metadata,
        ...(trialDays > 0
          ? {
              trial_period_days: trialDays,
              // A card is still collected up front, so a trial that reaches its end
              // converts instead of silently lapsing. This only fires if Stripe ends
              // up without a payment method on the subscription.
              trial_settings: { end_behavior: { missing_payment_method: "cancel" as const } },
            }
          : {}),
      },
      success_url: `${origin}/settings?checkout=success`,
      cancel_url: `${origin}${PLANS[plan].cancelPath}?checkout=cancelled`,
    });
  } catch {
    return Response.json({ error: "Could not open checkout. Please try again shortly." }, { status: 503 });
  }

}
