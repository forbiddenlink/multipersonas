import * as Sentry from "@sentry/nextjs";
import Stripe from "stripe";
import type { Database } from "@/lib/supabase/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { GRANT_RANK, PLANS, GraceAnchor, isEntitledSubscriptionStatus, isPlanKey, parseGraceAnchors, pastDueGraceEndsAt } from "@/lib/plans";
import { captureServerEvent } from "@/lib/analytics-server";

export const runtime = "nodejs";

function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

const isMissingColumn = (error: { code?: string } | null): boolean => error?.code === "42703" || error?.code === "PGRST204";

async function setPlan(
  userId: string,
  plan: "free" | "pro" | "team",
  customerId?: string,
  trialEndsAt: string | null = null,
  graceEndsAt: string | null = null,
  fallbackPlan: "free" | "pro" | "team" = "free",
  graceAnchors?: Record<string, GraceAnchor> | null,
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client is not configured");
  const base = customerId ? { plan, stripe_customer_id: customerId } : { plan };
  const write = async (values: Database["public"]["Tables"]["profiles"]["Update"]) =>
    admin.from("profiles").update(values).eq("id", userId).select("id").maybeSingle();
  // trial_ends_at lets the spend path cap trialing callers lower (lib/spend.ts);
  // access_grace_ends_at limits a past_due plan (lib/plans.ts planAfterGrace).
  let { data, error } = await write({ ...base, trial_ends_at: trialEndsAt, access_grace_ends_at: graceEndsAt, grace_fallback_plan: graceEndsAt && fallbackPlan !== "free" ? fallbackPlan : null, ...(graceAnchors === undefined ? {} : { access_grace_anchors: graceAnchors }) });
  // Deploy order: a marker column may not exist yet (Postgres 42703, or PostgREST PGRST204).
  // Step down one column at a time so a missing grace column does not also drop the trial
  // marker. Without the grace column a graced plan cannot expire, so only the still-paid
  // fallback plan (or "free") is written (fail closed); a plain paid plan is unaffected.
  if (isMissingColumn(error)) {
    const safePlan = graceEndsAt ? fallbackPlan : plan;
    const safeBase = customerId ? { plan: safePlan, stripe_customer_id: customerId } : { plan: safePlan };
    ({ data, error } = await write({ ...safeBase, trial_ends_at: trialEndsAt }));
    if (isMissingColumn(error)) ({ data, error } = await write(safeBase));
  }
  if (error || !data) throw new Error("Could not persist subscription access");
}

type StoredGrace = { end: string | null; anchors: Record<string, GraceAnchor> | null };

/**
 * The grace state already stored for this user, so a later webhook cannot move a deadline
 * forward. `anchors` maps each past_due subscription id to the tier it grants and ITS OWN first deadline; `end` is the
 * profile-level deadline, used only as a cap when no per-subscription anchors were stored yet.
 */
async function readStoredGrace(userId: string): Promise<StoredGrace> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Admin client is not configured");
  const { data, error } = await admin.from("profiles").select("access_grace_ends_at, access_grace_anchors").eq("id", userId).maybeSingle();
  if (isMissingColumn(error)) return { end: null, anchors: null };
  if (error) throw new Error("Could not read subscription grace state");
  const row = data as { access_grace_ends_at?: string | null; access_grace_anchors?: unknown } | null;
  return { end: row?.access_grace_ends_at ?? null, anchors: parseGraceAnchors(row?.access_grace_anchors) };
}

async function syncPaidPlan(stripe: Stripe, userId: string, customerId: string): Promise<void> {
  // Webhooks can be retried or delivered out of order. Read current subscriptions
  // so an old cancellation cannot revoke a replacement subscription's access.
  // Keep the STRONGEST entitled grant rather than the first one seen: a customer who
  // upgrades solo -> founding briefly holds both, and stopping at the first match
  // could downgrade them to the tier they just left.
  let firmPlan: "free" | "pro" | "team" = "free";
  // Every owned past_due subscription with its OWN deadline (null = no period start, so no
  // grace). Lapsed ones are kept: continuous delinquency must keep its stored deadline.
  const pastDue: { id: string; grant: "free" | "pro" | "team"; end: number | null }[] = [];
  let anyActive = false;
  let latestTrialEnd: number | null = null;
  for await (const subscription of stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })) {
    const key = subscription.metadata.personaudit_plan;
    if (!isPlanKey(key) || subscription.metadata.supabase_user_id !== userId) continue;
    const grant = PLANS[key].grants;
    if (subscription.status === "past_due") {
      // past_due keeps access only inside the grace window; Stripe may leave it past_due
      // after retries end, so it must expire on its own (lib/plans.ts).
      pastDue.push({ id: subscription.id, grant, end: pastDueGraceEndsAt(subscription.items?.data?.map((item) => item.current_period_start) ?? []) });
    } else if (isEntitledSubscriptionStatus(subscription.status)) {
      if (GRANT_RANK[grant] > GRANT_RANK[firmPlan]) firmPlan = grant;
      if (subscription.status !== "trialing") anyActive = true;
      else if (typeof subscription.trial_end === "number") {
        latestTrialEnd = Math.max(latestTrialEnd ?? 0, subscription.trial_end);
      }
    }
  }
  // Each past_due subscription's window is fixed at ITS first past_due sync and never moved
  // while that subscription stays past_due, even after it expires and whichever subscription
  // currently grants access. A later period start (a billing-period advance while still
  // delinquent) must not grant a fresh window, and one subscription's deadline must never cap
  // or extend another's. Anchors for subscriptions no longer past_due are dropped, so a real
  // recovery followed by a new failure starts a new window.
  const stored = await readStoredGrace(userId);
  const storedEndMs = stored.end !== null && Number.isFinite(Date.parse(stored.end)) ? Date.parse(stored.end) : null;
  const anchors: Record<string, GraceAnchor> = {};
  const effective = pastDue.map((sub) => {
    // No period start means no grace now, but the subscription is still anchored (at "now", already
    // over), so a later sync that does carry a period start cannot open a fresh window for the
    // same continuous delinquency.
    const rawEnd = sub.end ?? Date.now();
    const own = stored.anchors?.[sub.id] ? Date.parse(stored.anchors[sub.id]!.ends_at) : NaN;
    // No per-subscription anchor stored (state written before anchors existed): the profile-level
    // deadline can still only shorten the window, never extend it.
    const cap = Number.isFinite(own) ? own : stored.anchors === null ? storedEndMs : null;
    const effEnd = cap === null ? rawEnd : Math.min(rawEnd, cap);
    if (sub.grant !== "free") anchors[sub.id] = { plan: sub.grant, ends_at: new Date(effEnd).toISOString() };
    return { ...sub, effEnd: effEnd as number | null };
  });
  // Each subscription earns grace only from its OWN unexpired deadline. The highest tier among
  // those wins, so an expired Agency window cannot lend its tier to a Solo still inside its own.
  const now = Date.now();
  let gracedPlan: "free" | "pro" | "team" = "free";
  let gracedEnd: number | null = null;
  for (const sub of effective) {
    if (sub.effEnd === null || sub.effEnd <= now) continue;
    // A delinquent subscription has paid before, so it is the paid one and clears the trial marker.
    anyActive = true;
    if (GRANT_RANK[sub.grant] > GRANT_RANK[gracedPlan]) {
      gracedPlan = sub.grant;
      gracedEnd = sub.effEnd;
    } else if (sub.grant === gracedPlan) gracedEnd = Math.max(gracedEnd ?? 0, sub.effEnd);
  }
  // Trialing only if nothing entitled is already paid; a paid subscription clears it.
  const trialEndsAt = !anyActive && latestTrialEnd !== null ? new Date(latestTrialEnd * 1000).toISOString() : null;
  // Grace limits access only when the strongest grant rests on a past_due subscription.
  const delinquent = GRANT_RANK[gracedPlan] > GRANT_RANK[firmPlan];
  // While access rests on grace, store the deadline of the tier actually granted, so the
  // read-time expiry (planAfterGrace) cannot outlive that tier's own window even after a
  // later-deadline subscription is canceled. With nothing granted via grace, keep the latest
  // (lapsed) deadline; with no period start the deadline is "now".
  const latestEffEnd = effective.reduce<number | null>((m, sub) => (sub.effEnd === null ? m : Math.max(m ?? 0, sub.effEnd)), null);
  const graceEndsAt = pastDue.length === 0
    ? null
    : delinquent && gracedEnd !== null
      ? new Date(gracedEnd).toISOString()
      : new Date(latestEffEnd ?? now).toISOString();
  // undefined (key omitted) when there is nothing to store or clear, so unaffected writes keep their shape.
  const graceAnchors = pastDue.length > 0 ? anchors : stored.anchors !== null ? null : undefined;
  await setPlan(userId, delinquent ? gracedPlan : firmPlan, customerId, trialEndsAt, graceEndsAt, firmPlan, graceAnchors);
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
