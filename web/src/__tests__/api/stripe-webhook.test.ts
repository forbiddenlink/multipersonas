import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { constructEvent, listSubscriptions, createAdminClient, update, eq, select, maybeSingle } = vi.hoisted(() => ({
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

import { POST } from "@/app/api/stripe/webhook/route";

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
  createAdminClient.mockReturnValue({ from: vi.fn(() => ({ update })) });
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
    expect(update).toHaveBeenCalledWith({ plan: "team", stripe_customer_id: "cus_test" });
    expect(eq).toHaveBeenCalledWith("id", "user-1");
    expect(maybeSingle).toHaveBeenCalled();
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
    expect(update).toHaveBeenCalledWith({ plan: "team", stripe_customer_id: "cus_test" });
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
    expect(update).toHaveBeenNthCalledWith(1, { plan: "team", stripe_customer_id: "cus_test" });
    expect(update).toHaveBeenNthCalledWith(2, { plan: "team", stripe_customer_id: "cus_test" });
  });

  it.each(["active", "canceled", "unpaid"])("persists subscription status %s", async (status) => {
    activeSubscriptions(status === "active" ? [{ id: "sub_current", metadata }] : []);
    constructEvent.mockReturnValue({ type: "customer.subscription.updated", data: { object: { metadata, status, customer: "cus_test" } } });
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith({ plan: status === "active" ? "team" : "free", stripe_customer_id: "cus_test" });
  });

  it("grants the solo tier its own lower entitlement", async () => {
    const solo = { personaudit_plan: "solo", supabase_user_id: "user-1" };
    activeSubscriptions([{ id: "sub_solo", metadata: solo }]);
    constructEvent.mockReturnValue({ type: "customer.subscription.updated", data: { object: { metadata: solo, status: "active", customer: "cus_test" } } });
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith({ plan: "pro", stripe_customer_id: "cus_test" });
  });

  it("keeps the stronger grant while an upgrade leaves both subscriptions entitled", async () => {
    const solo = { personaudit_plan: "solo", supabase_user_id: "user-1" };
    activeSubscriptions([{ id: "sub_solo", metadata: solo }, { id: "sub_founding", metadata }]);
    constructEvent.mockReturnValue({ type: "customer.subscription.updated", data: { object: { metadata, status: "active", customer: "cus_test" } } });
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith({ plan: "team", stripe_customer_id: "cus_test" });
  });

  it("does not restore access when an old paid checkout arrives after cancellation", async () => {
    activeSubscriptions([]);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith({ plan: "free", stripe_customer_id: "cus_test" });
  });

  it("keeps access when an old subscription cancellation arrives after renewal or replacement", async () => {
    constructEvent.mockReturnValue({ type: "customer.subscription.deleted", data: { object: {
      metadata, status: "canceled", customer: "cus_test",
    } } });
    expect((await POST(request())).status).toBe(200);
    expect(listSubscriptions).toHaveBeenCalledWith({ customer: "cus_test", status: "all", limit: 100 });
    expect(update).toHaveBeenCalledWith({ plan: "team", stripe_customer_id: "cus_test" });
  });

  it("does not grant access for another product or another account's subscription", async () => {
    activeSubscriptions([
      { id: "sub_other_product", metadata: { ...metadata, personaudit_plan: "other" } },
      { id: "sub_other_user", metadata: { ...metadata, supabase_user_id: "user-2" } },
    ]);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith({ plan: "free", stripe_customer_id: "cus_test" });
  });

  it("checks beyond unrelated subscriptions for current paid access", async () => {
    activeSubscriptions([
      ...Array.from({ length: 100 }, (_, i) => ({ id: `sub_other_${i}`, metadata: { ...metadata, personaudit_plan: "other" } })),
      { id: "sub_current", metadata },
    ]);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith({ plan: "team", stripe_customer_id: "cus_test" });
  });

  it("keeps trial access when checkout requires no initial payment", async () => {
    checkoutEvent("checkout.session.completed", "no_payment_required");
    activeSubscriptions([{ id: "sub_trial", metadata, status: "trialing" }]);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith({ plan: "team", stripe_customer_id: "cus_test" });
  });

  it.each(["canceled", "past_due", "unpaid", "incomplete", "incomplete_expired", "paused"])("does not grant access from a current %s subscription", async (status) => {
    activeSubscriptions([{ id: "sub_inactive", metadata, status }]);
    expect((await POST(request())).status).toBe(200);
    expect(update).toHaveBeenCalledWith({ plan: "free", stripe_customer_id: "cus_test" });
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

  it("ignores unrelated events", async () => {
    constructEvent.mockReturnValue({ type: "payment_intent.succeeded", data: { object: {} } });
    expect((await POST(request())).status).toBe(200);
    expect(update).not.toHaveBeenCalled();
  });
});
