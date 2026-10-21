import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { constructEvent, listSubscriptions, createAdminClient, update, eq, select, maybeSingle, readGraceEnd } = vi.hoisted(() => ({
  readGraceEnd: vi.fn(),
  constructEvent: vi.fn(),
  listSubscriptions: vi.fn(),
  createAdminClient: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class Stripe {
    webhooks = { constructEvent };
    subscriptions = { list: listSubscriptions };
  },
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));
const { captureException } = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException }));
const { captureServerEvent } = vi.hoisted(() => ({ captureServerEvent: vi.fn() }));
vi.mock("@/lib/analytics-server", () => ({ captureServerEvent }));

import { POST } from "@/app/api/stripe/webhook/route";
import { PAST_DUE_GRACE_DAYS } from "@/lib/plans";
import { callerCapFor, CALLER_DAILY_CALL_CAP, TRIAL_CALLER_DAILY_CALL_CAP } from "@/lib/limits";

const metadata = { personaudit_plan: "founding", supabase_user_id: "user-1" };

function activeSubscriptions(items: { id: string; metadata: typeof metadata; status?: string }[] = [{ id: "sub_current", metadata }]): void {
  listSubscriptions.mockImplementation(async function* () {
    for (const item of items) yield { status: "active", ...item };
  });
}

function checkoutEvent(type = "checkout.session.completed", paymentStatus = "paid"): void {
  constructEvent.mockReturnValue({
    type,
    data: { object: { mode: "subscription", metadata, customer: "cus_test", payment_status: paymentStatus } },
  });
}

function request(): Request {
  return new Request("https://personaudit.com/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "synthetic-signature" },
    body: "synthetic-event-body",
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("STRIPE_SECRET_KEY", "synthetic-stripe-key");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "synthetic-webhook-secret");
  readGraceEnd.mockResolvedValue({ data: { access_grace_ends_at: null, grace_fallback_plan: null }, error: null });
  createAdminClient.mockReturnValue({
    from: vi.fn(() => ({ update, select: () => ({ eq: () => ({ maybeSingle: readGraceEnd }) }) })),
  });
  update.mockReturnValue({ eq });
  eq.mockReturnValue({ select });
  select.mockReturnValue({ maybeSingle });
  maybeSingle.mockResolvedValue({ data: { id: "user-1" }, error: null });
  activeSubscriptions();
  checkoutEvent();
});

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/stripe/webhook", () => {
  it("verifies the raw body before granting paid founding access", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(constructEvent).toHaveBeenCalledWith("synthetic-event-body", "synthetic-signature", "synthetic-webhook-secret");
    expect(update).toHaveBeenCalledWith({ plan: "team", stripe_customer_id: "cus_test", trial_ends_at: null, access_grace_ends_at: null, grace_fallback_plan: null });
    expect(eq).toHaveBeenCalledWith("id", "user-1");
    expect(maybeSingle).toHaveBeenCalled();
  });

  it.each(["checkout.session.completed", "checkout.session.expired", "checkout.session.async_payment_failed"])("reconciles an unknown session id from the signed %s event", async (type) => {
    const saveSession = vi.fn(async () => ({ data: [{ id: "attempt-1" }], error: null }));
    const query = { eq: vi.fn(() => query), is: vi.fn(() => query), select: saveSession };
    const bindSession = vi.fn(() => query);
    createAdminClient.mockReturnValue({ from: vi.fn((table: string) => table === "checkout_attempts" ? { update: bindSession } : { update }) });
    constructEvent.mockReturnValue({ type, data: { object: {
      id: "cs_synthetic", mode: "subscription", metadata: { ...metadata, personaudit_checkout_attempt: "attempt-1" },
      customer: "cus_test", payment_status: "unpaid",
    } } });
    expect((await POST(request())).status).toBe(200);
    expect(bindSession).toHaveBeenCalledWith({ session_id: "cs_synthetic" });
    expect(query.eq).toHaveBeenCalledWith("id", "attempt-1");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.is).toHaveBeenCalledWith("session_id", null);
    expect(update).not.toHaveBeenCalled();
  });

  it("records a started subscription in analytics with the plan key and no billing data", async () => {
    constructEvent.mockReturnValue({ id: "evt_1", type: "checkout.session.completed", data: { object: { mode: "subscription", metadata, customer: "cus_test", payment_status: "paid" } } });
    expect((await POST(request())).status).toBe(200);
    expect(captureServerEvent).toHaveBeenCalledWith("user-1", "subscription_started", { plan: "founding", stripe_event_id: "evt_1" });
  });

  it("records a cancellation only for a deleted subscription", async () => {
    activeSubscriptions([]);
    constructEvent.mockReturnValue({ id: "evt_2", type: "customer.subscription.deleted", data: { object: { metadata, customer: "cus_test" } } });
    expect((await POST(request())).status).toBe(200);
    expect(captureServerEvent).toHaveBeenCalledWith("user-1", "subscription_cancelled", { plan: "founding", stripe_event_id: "evt_2" });

    captureServerEvent.mockClear();
    constructEvent.mockReturnValue({ id: "evt_3", type: "customer.subscription.updated", data: { object: { metadata, customer: "cus_test" } } });
    await POST(request());
    expect(captureServerEvent).not.toHaveBeenCalled();
  });

  it("does not record a subscription for a checkout still awaiting payment", async () => {
    checkoutEvent("checkout.session.completed", "unpaid");
    await POST(request());
    expect(captureServerEvent).not.toHaveBeenCalled();
  });

  it("rejects an invalid signature without accessing the database", async () => {
    constructEvent.mockImplementation(() => { throw new Error("bad signature"); });
    expect((await POST(request())).status).toBe(400);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("does not grant access for a checkout still awaiting payment", async () => {
    checkoutEvent("checkout.session.completed", "unpaid");
    expect((await POST(request())).status).toBe(200);
    expect(update).not.toHaveBeenCalled();
  });

  it("grants access when a delayed checkout payment succeeds", async () => {
    checkoutEvent("checkout.session.async_payment_succeeded");
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith({ plan: "team", stripe_customer_id: "cus_test", trial_ends_at: null, access_grace_ends_at: null, grace_fallback_plan: null });
  });

  it("accepts a subscription checkout requiring no payment", async () => {
    checkoutEvent("checkout.session.completed", "no_payment_required");
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalled();
  });

  it("does not grant subscription access for a one-time payment", async () => {
    constructEvent.mockReturnValue({ type: "checkout.session.completed", data: { object: {
      mode: "payment", metadata, customer: "cus_test", payment_status: "paid",
    } } });
    expect((await POST(request())).status).toBe(200);
    expect(update).not.toHaveBeenCalled();
  });

  it.each([
    { data: null, error: { message: "synthetic database failure" } },
    { data: null, error: null },
  ])("returns a retryable failure when the profile update is not persisted: %j", async (result) => {
    maybeSingle.mockResolvedValue(result);
    expect((await POST(request())).status).toBe(500);
  });

  it("returns a retryable failure when the database is unavailable", async () => {
    createAdminClient.mockReturnValue(null);
    expect((await POST(request())).status).toBe(500);
  });

  it("can safely repeat a paid-access assignment", async () => {
    expect((await POST(request())).status).toBe(200);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenNthCalledWith(1, { plan: "team", stripe_customer_id: "cus_test", trial_ends_at: null, access_grace_ends_at: null, grace_fallback_plan: null });
    expect(update).toHaveBeenNthCalledWith(2, { plan: "team", stripe_customer_id: "cus_test", trial_ends_at: null, access_grace_ends_at: null, grace_fallback_plan: null });
  });

  it.each(["active", "canceled", "unpaid"])("persists subscription status %s", async (status) => {
    activeSubscriptions(status === "active" ? [{ id: "sub_current", metadata }] : []);
    constructEvent.mockReturnValue({ type: "customer.subscription.updated", data: { object: { metadata, status, customer: "cus_test" } } });
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith({ plan: status === "active" ? "team" : "free", stripe_customer_id: "cus_test", trial_ends_at: null, access_grace_ends_at: null, grace_fallback_plan: null });
  });

  it("grants the solo tier its own lower entitlement", async () => {
    const solo = { personaudit_plan: "solo", supabase_user_id: "user-1" };
    activeSubscriptions([{ id: "sub_solo", metadata: solo }]);
    constructEvent.mockReturnValue({ type: "customer.subscription.updated", data: { object: { metadata: solo, status: "active", customer: "cus_test" } } });
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith({ plan: "pro", stripe_customer_id: "cus_test", trial_ends_at: null, access_grace_ends_at: null, grace_fallback_plan: null });
  });

  it("keeps the stronger grant while an upgrade leaves both subscriptions entitled", async () => {
    const solo = { personaudit_plan: "solo", supabase_user_id: "user-1" };
    activeSubscriptions([{ id: "sub_solo", metadata: solo }, { id: "sub_founding", metadata }]);
    constructEvent.mockReturnValue({ type: "customer.subscription.updated", data: { object: { metadata, status: "active", customer: "cus_test" } } });
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith({ plan: "team", stripe_customer_id: "cus_test", trial_ends_at: null, access_grace_ends_at: null, grace_fallback_plan: null });
  });

  it("does not restore access when an old paid checkout arrives after cancellation", async () => {
    activeSubscriptions([]);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith({ plan: "free", stripe_customer_id: "cus_test", trial_ends_at: null, access_grace_ends_at: null, grace_fallback_plan: null });
  });

  it("keeps access when an old subscription cancellation arrives after renewal or replacement", async () => {
    constructEvent.mockReturnValue({ type: "customer.subscription.deleted", data: { object: {
      metadata, status: "canceled", customer: "cus_test",
    } } });
    expect((await POST(request())).status).toBe(200);
    expect(listSubscriptions).toHaveBeenCalledWith({ customer: "cus_test", status: "all", limit: 100 });
    expect(update).toHaveBeenCalledWith({ plan: "team", stripe_customer_id: "cus_test", trial_ends_at: null, access_grace_ends_at: null, grace_fallback_plan: null });
  });

  it("does not grant access for another product or another account's subscription", async () => {
    activeSubscriptions([
      { id: "sub_other_product", metadata: { ...metadata, personaudit_plan: "other" } },
      { id: "sub_other_user", metadata: { ...metadata, supabase_user_id: "user-2" } },
    ]);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith({ plan: "free", stripe_customer_id: "cus_test", trial_ends_at: null, access_grace_ends_at: null, grace_fallback_plan: null });
  });

  it("checks beyond unrelated subscriptions for current paid access", async () => {
    activeSubscriptions([
      ...Array.from({ length: 100 }, (_, i) => ({ id: `sub_other_${i}`, metadata: { ...metadata, personaudit_plan: "other" } })),
      { id: "sub_current", metadata },
    ]);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith({ plan: "team", stripe_customer_id: "cus_test", trial_ends_at: null, access_grace_ends_at: null, grace_fallback_plan: null });
  });

  it("keeps trial access when checkout requires no initial payment", async () => {
    checkoutEvent("checkout.session.completed", "no_payment_required");
    activeSubscriptions([{ id: "sub_trial", metadata, status: "trialing" }]);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith({ plan: "team", stripe_customer_id: "cus_test", trial_ends_at: null, access_grace_ends_at: null, grace_fallback_plan: null });
  });

  const DAY = 86_400;
  const nowSec = (): number => Math.floor(Date.now() / 1000);
  const pastDue = (failedDaysAgo: number, meta = metadata) =>
    ({ id: "sub_late", metadata: meta, status: "past_due", items: { data: [{ current_period_start: nowSec() - failedDaysAgo * DAY }] } }) as never;

  it("keeps access inside the past_due grace window and records when it ends", async () => {
    const failedAt = nowSec() - 2 * DAY;
    activeSubscriptions([{ id: "sub_retrying", metadata, status: "past_due", items: { data: [{ current_period_start: failedAt }] } } as never]);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      plan: "team",
      stripe_customer_id: "cus_test",
      trial_ends_at: null,
      access_grace_ends_at: new Date((failedAt + PAST_DUE_GRACE_DAYS * DAY) * 1000).toISOString(),
      grace_fallback_plan: null,
    }));
  });

  it("revokes access once the past_due grace window has passed", async () => {
    activeSubscriptions([pastDue(PAST_DUE_GRACE_DAYS + 1)]);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ plan: "free", trial_ends_at: null }));
  });

  it("fails closed when a past_due subscription carries no period start", async () => {
    activeSubscriptions([{ id: "sub_late", metadata, status: "past_due" } as never]);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ plan: "free", trial_ends_at: null }));
  });

  it("does not limit access by grace while an active subscription backs the same tier", async () => {
    activeSubscriptions([pastDue(1), { id: "sub_paid", metadata, status: "active" }]);
    expect((await POST(request())).status).toBe(200);
    // The deadline stays anchored (any past_due keeps it) but the fallback is the still-paid tier.
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ plan: "team", trial_ends_at: null, grace_fallback_plan: "team" }));
  });

  it("treats a future trial plus a delinquent paid subscription as paid: no trial marker, normal spending cap", async () => {
    const trialEnd = nowSec() + 14 * DAY;
    const solo = { personaudit_plan: "solo", supabase_user_id: "user-1" };
    activeSubscriptions([
      { id: "sub_trial", metadata: solo, status: "trialing", trial_end: trialEnd } as never,
      pastDue(1),
    ]);
    expect((await POST(request())).status).toBe(200);
    const written = update.mock.calls[0]?.[0] as { plan: string; trial_ends_at: string | null };
    expect(written.plan).toBe("team");
    // A delinquent subscription has paid before, so the account must not be dropped back to
    // the lower trial cap. Reverting `!== "trialing"` to `=== "active"` would set the marker.
    expect(written.trial_ends_at).toBeNull();
    expect(callerCapFor(written.trial_ends_at)).toBe(CALLER_DAILY_CALL_CAP);
    expect(callerCapFor(new Date(trialEnd * 1000).toISOString())).toBe(TRIAL_CALLER_DAILY_CALL_CAP);
  });

  it.each(["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"])("does not grant access from a current %s subscription", async (status) => {
    activeSubscriptions([{ id: "sub_inactive", metadata, status }]);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith({ plan: "free", stripe_customer_id: "cus_test", trial_ends_at: null, access_grace_ends_at: null, grace_fallback_plan: null });
  });

  it("keeps existing access untouched and requests a retry when Stripe is unavailable", async () => {
    listSubscriptions.mockImplementation(() => {
      throw new Error("private provider detail");
    });
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(update).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain("private provider detail");
  });

  it("records when a trial ends so the spend path can cap trialing callers lower", async () => {
    const trialEnd = Math.floor(Date.now() / 1000) + 14 * 86_400;
    activeSubscriptions([{ id: "sub_trial", metadata, status: "trialing", trial_end: trialEnd } as never]);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      plan: "team",
      stripe_customer_id: "cus_test",
      trial_ends_at: new Date(trialEnd * 1000).toISOString(),
      access_grace_ends_at: null,
      grace_fallback_plan: null,
    });
  });

  it("clears the trial marker once any entitled subscription is active", async () => {
    const trialEnd = Math.floor(Date.now() / 1000) + 14 * 86_400;
    const solo = { personaudit_plan: "solo", supabase_user_id: "user-1" };
    activeSubscriptions([
      { id: "sub_trial", metadata: solo, status: "trialing", trial_end: trialEnd } as never,
      { id: "sub_paid", metadata, status: "active" },
    ]);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith({ plan: "team", stripe_customer_id: "cus_test", trial_ends_at: null, access_grace_ends_at: null, grace_fallback_plan: null });
  });

  it("ignores another account's trial when recording the marker", async () => {
    const trialEnd = Math.floor(Date.now() / 1000) + 14 * 86_400;
    activeSubscriptions([
      { id: "sub_other_user", metadata: { ...metadata, supabase_user_id: "user-2" }, status: "trialing", trial_end: trialEnd } as never,
    ]);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith({ plan: "free", stripe_customer_id: "cus_test", trial_ends_at: null, access_grace_ends_at: null, grace_fallback_plan: null });
  });

  const missing = (code: string) => ({ data: null, error: { code, message: "column does not exist" } });
  const ok = { data: { id: "user-1" }, error: null };

  it.each(["42703", "PGRST204"])("drops only the grace column first and keeps the trial marker (%s)", async (code) => {
    maybeSingle.mockResolvedValueOnce(missing(code)).mockResolvedValueOnce(ok);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenNthCalledWith(1, { plan: "team", stripe_customer_id: "cus_test", trial_ends_at: null, access_grace_ends_at: null, grace_fallback_plan: null });
    expect(update).toHaveBeenNthCalledWith(2, { plan: "team", stripe_customer_id: "cus_test", trial_ends_at: null });
  });

  it("drops the trial marker too only when that column is also absent", async () => {
    maybeSingle.mockResolvedValueOnce(missing("42703")).mockResolvedValueOnce(missing("42703")).mockResolvedValueOnce(ok);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenNthCalledWith(3, { plan: "team", stripe_customer_id: "cus_test" });
  });

  it.each(["42703", "PGRST204"])("writes free, not the graced plan, when the grace column is missing (%s)", async (code) => {
    activeSubscriptions([pastDue(1)]);
    maybeSingle.mockResolvedValueOnce(missing(code)).mockResolvedValueOnce(ok);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenNthCalledWith(2, { plan: "free", stripe_customer_id: "cus_test", trial_ends_at: null });
  });

  it("keeps a still-paid Solo as the fallback while Agency is in grace, and drops to it afterwards", async () => {
    const solo = { personaudit_plan: "solo", supabase_user_id: "user-1" };
    const failedAt = nowSec() - 1 * DAY;
    activeSubscriptions([
      { id: "sub_solo", metadata: solo, status: "active" },
      { id: "sub_team", metadata, status: "past_due", items: { data: [{ current_period_start: failedAt }] } } as never,
    ]);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({
      plan: "team",
      stripe_customer_id: "cus_test",
      trial_ends_at: null,
      access_grace_ends_at: new Date((failedAt + PAST_DUE_GRACE_DAYS * DAY) * 1000).toISOString(),
      grace_fallback_plan: "pro",
    }));
    // Lapsed window: the stored plan becomes the fallback, never free while Solo is paid.
    update.mockClear();
    readGraceEnd.mockResolvedValue({ data: { access_grace_ends_at: new Date(Date.now() - DAY * 1000).toISOString() }, error: null });
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ plan: "pro" }));
  });

  it("gives Solo only its own window when an Agency subscription's grace already expired (no stored anchor)", async () => {
    const solo = { personaudit_plan: "solo", supabase_user_id: "user-1" };
    const soloFailedAt = nowSec() - 1 * DAY;
    activeSubscriptions([
      pastDue(PAST_DUE_GRACE_DAYS + 3),
      { id: "sub_solo", metadata: solo, status: "past_due", items: { data: [{ current_period_start: soloFailedAt }] } } as never,
    ]);
    expect((await POST(request())).status).toBe(200);
    // Agency's 7-day window ended 3 days ago: no `team`. Solo keeps `pro` until ITS deadline.
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({
      plan: "pro",
      stripe_customer_id: "cus_test",
      trial_ends_at: null,
      access_grace_ends_at: new Date((soloFailedAt + PAST_DUE_GRACE_DAYS * DAY) * 1000).toISOString(),
      grace_fallback_plan: null,
    }));
  });

  it("shortens the stored anchor to the remaining Agency deadline when the later-deadline subscription is canceled", async () => {
    // Two past_due Agency subscriptions: grace ends in 3 days (early) and in 7 days (late).
    const early = nowSec() - 4 * DAY;
    const late = nowSec();
    const earlyEnd = new Date((early + PAST_DUE_GRACE_DAYS * DAY) * 1000).toISOString();
    const lateEnd = new Date((late + PAST_DUE_GRACE_DAYS * DAY) * 1000).toISOString();
    // The first sync stored the later deadline; the late subscription is then canceled.
    readGraceEnd.mockResolvedValue({ data: { access_grace_ends_at: lateEnd }, error: null });
    activeSubscriptions([{ id: "sub_early", metadata, status: "past_due", items: { data: [{ current_period_start: early }] } } as never]);
    constructEvent.mockReturnValue({ type: "customer.subscription.deleted", data: { object: { metadata, status: "canceled", customer: "cus_test" } } });
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({
      plan: "team",
      stripe_customer_id: "cus_test",
      trial_ends_at: null,
      access_grace_ends_at: earlyEnd,
      grace_fallback_plan: null,
    }));
  });

  it("gives an Agency subscription with no period start no grace, even beside a Solo inside its window", async () => {
    const solo = { personaudit_plan: "solo", supabase_user_id: "user-1" };
    activeSubscriptions([
      { id: "sub_team", metadata, status: "past_due" } as never,
      { id: "sub_solo", metadata: solo, status: "past_due", items: { data: [{ current_period_start: nowSec() - 1 * DAY }] } } as never,
    ]);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ plan: "pro" }));
  });

  it("does not extend the window when a later past_due webhook sees a newer period start", async () => {
    const firstGraceEnd = new Date(Date.now() + 3 * DAY * 1000).toISOString();
    readGraceEnd.mockResolvedValue({ data: { access_grace_ends_at: firstGraceEnd, grace_fallback_plan: null }, error: null });
    activeSubscriptions([pastDue(0)]); // a retry moved current_period_start to now
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ plan: "team", stripe_customer_id: "cus_test", trial_ends_at: null, access_grace_ends_at: firstGraceEnd, grace_fallback_plan: null }));
  });

  it("stays free after the stored window ended even if a newer period start would reopen it", async () => {
    const expired = new Date(Date.now() - DAY * 1000).toISOString();
    readGraceEnd.mockResolvedValue({ data: { access_grace_ends_at: expired, grace_fallback_plan: null }, error: null });
    activeSubscriptions([pastDue(0)]);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ plan: "free", stripe_customer_id: "cus_test", trial_ends_at: null, access_grace_ends_at: expired, grace_fallback_plan: null }));
  });

  it("keeps the expired deadline while still past_due, so a later period start cannot reopen access", async () => {
    // Webhook 1, after the window: lapsed past_due, nothing stored yet -> free, expired deadline stored.
    activeSubscriptions([pastDue(PAST_DUE_GRACE_DAYS + 1)]);
    expect((await POST(request())).status).toBe(200);
    const stored = (update.mock.calls.at(-1)?.[0] as { access_grace_ends_at: string }).access_grace_ends_at;
    expect(stored).not.toBeNull();
    expect(Date.parse(stored)).toBeLessThan(Date.now());
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ plan: "free" }));
    // Webhook 2: still past_due, new retry/period moved current_period_start to now. Deadline kept, still free.
    readGraceEnd.mockResolvedValue({ data: { access_grace_ends_at: stored }, error: null });
    activeSubscriptions([pastDue(0)]);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ plan: "free", access_grace_ends_at: stored }));
  });

  it("keeps the deadline across an overlapping trial that is later canceled, never moving it forward", async () => {
    const trialEnd = nowSec() + 14 * DAY;
    const lastGraceEnd = () => (update.mock.calls.at(-1)?.[0] as { access_grace_ends_at: string | null }).access_grace_ends_at;
    // 1. Expired past_due Team alongside a trialing Team: first sight stores an expired deadline.
    activeSubscriptions([pastDue(PAST_DUE_GRACE_DAYS + 1), { id: "sub_trial", metadata, status: "trialing", trial_end: trialEnd } as never]);
    expect((await POST(request())).status).toBe(200);
    const stored = lastGraceEnd();
    expect(stored).not.toBeNull();
    expect(Date.parse(stored as string)).toBeLessThan(Date.now());
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ plan: "team", grace_fallback_plan: "team" }));
    // 2. Trial overlaps again on a later webhook: deadline unchanged.
    readGraceEnd.mockResolvedValue({ data: { access_grace_ends_at: stored }, error: null });
    activeSubscriptions([pastDue(0), { id: "sub_trial", metadata, status: "trialing", trial_end: trialEnd } as never]);
    expect((await POST(request())).status).toBe(200);
    expect(lastGraceEnd()).toBe(stored);
    // 3. Trial canceled, new period on the original past_due sub: still the same expired deadline, free.
    activeSubscriptions([pastDue(0)]);
    expect((await POST(request())).status).toBe(200);
    expect(lastGraceEnd()).toBe(stored);
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ plan: "free" }));
  });

  it("does not restore an expired Agency window when its billing period advances beside a Solo still in grace", async () => {
    const solo = { personaudit_plan: "solo", supabase_user_id: "user-1" };
    const soloStart = nowSec() - 1 * DAY;
    const soloEnd = new Date((soloStart + PAST_DUE_GRACE_DAYS * DAY) * 1000).toISOString();
    const subs = (agencyStart: number) => [
      { id: "sub_agency", metadata, status: "past_due", items: { data: [{ current_period_start: agencyStart }] } } as never,
      { id: "sub_solo", metadata: solo, status: "past_due", items: { data: [{ current_period_start: soloStart }] } } as never,
    ];
    // Sync 1: Agency past_due long enough for its own window to be over, Solo still inside its own.
    activeSubscriptions(subs(nowSec() - (PAST_DUE_GRACE_DAYS + 3) * DAY));
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ plan: "pro", access_grace_ends_at: soloEnd }));
    // Sync 2: Agency's billing period advances while it stays continuously past_due. The write
    // from sync 1 is what the next webhook reads back.
    const stored = update.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    // Each anchor carries the tier it grants, so read-time expiry can keep Solo after Agency lapses.
    expect(stored.access_grace_anchors).toEqual({
      sub_agency: { plan: "team", ends_at: expect.any(String) },
      sub_solo: { plan: "pro", ends_at: soloEnd },
    });
    readGraceEnd.mockResolvedValue({ data: { access_grace_ends_at: stored.access_grace_ends_at, access_grace_anchors: stored.access_grace_anchors }, error: null });
    update.mockClear();
    activeSubscriptions(subs(nowSec()));
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ plan: "pro", access_grace_ends_at: soloEnd }));
  });

  it("does not open a fresh window when a past_due subscription first had no period start", async () => {
    // Sync 1: no period start, so no grace and no access, but the subscription is anchored at "now".
    activeSubscriptions([{ id: "sub_agency", metadata, status: "past_due", items: { data: [] } } as never]);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ plan: "free" }));
    const stored = update.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(stored.access_grace_anchors).toEqual({ sub_agency: { plan: "team", ends_at: expect.any(String) } });
    readGraceEnd.mockResolvedValue({ data: { access_grace_ends_at: stored.access_grace_ends_at, access_grace_anchors: stored.access_grace_anchors }, error: null });
    update.mockClear();
    // Sync 2: the period start now arrives; the same continuous delinquency must not get a new 7 days.
    activeSubscriptions([{ id: "sub_agency", metadata, status: "past_due", items: { data: [{ current_period_start: nowSec() }] } } as never]);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ plan: "free" }));
  });

  it("clears the stored window when the subscription returns to active", async () => {
    readGraceEnd.mockResolvedValue({ data: { access_grace_ends_at: new Date(Date.now() + DAY * 1000).toISOString() }, error: null });
    activeSubscriptions([{ id: "sub_current", metadata, status: "active" }]);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith({ plan: "team", stripe_customer_id: "cus_test", trial_ends_at: null, access_grace_ends_at: null, grace_fallback_plan: null });
  });


  it("does not retry other persistence errors", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { code: "23514", message: "check violation" } });
    expect((await POST(request())).status).toBe(500);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("ignores unrelated events", async () => {
    constructEvent.mockReturnValue({ type: "payment_intent.succeeded", data: { object: {} } });
    expect((await POST(request())).status).toBe(200);
    expect(update).not.toHaveBeenCalled();
  });

  it("keeps the 500 and captures a failed persist with event tags and no billing data", async () => {
    constructEvent.mockReturnValue({
      id: "evt_123",
      type: "checkout.session.completed",
      data: { object: { mode: "subscription", metadata, customer: "cus_secret", payment_status: "paid" } },
    });
    maybeSingle.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect((await POST(request())).status).toBe(500);
    expect(captureException).toHaveBeenCalledOnce();
    const [, hint] = captureException.mock.calls[0]!;
    expect(hint).toEqual({ tags: { route: "stripe-webhook", event_type: "checkout.session.completed", event_id: "evt_123" } });
    expect(JSON.stringify(captureException.mock.calls)).not.toContain("cus_secret");
    expect(JSON.stringify(captureException.mock.calls)).not.toContain("user-1");
  });
});
