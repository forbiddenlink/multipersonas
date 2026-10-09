import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, createSession, retrieveSession, retrieveSubscription, readProfile, getAdmin } = vi.hoisted(() => ({
  getUser: vi.fn(),
  createSession: vi.fn(),
  retrieveSession: vi.fn(),
  retrieveSubscription: vi.fn(),
  getAdmin: vi.fn(),
  readProfile: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser }, from: () => ({ select: () => ({ eq: () => ({ single: readProfile }) }) }) })),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: getAdmin }));

vi.mock("stripe", () => ({
  default: class Stripe {
    checkout = { sessions: { create: createSession, retrieve: retrieveSession } };
    subscriptions = { retrieve: retrieveSubscription };
  },
}));

type Attempt = Database["public"]["Tables"]["checkout_attempts"]["Row"];
let reservation: Attempt | null;
let storeError: string | null;
let saveError: boolean;
let checkoutStatus: "open" | "complete" | "expired";
let subscriptionStatus: string;

function syntheticAdmin() {
  return createClient<Database>("https://synthetic.supabase.invalid", "synthetic-key", {
    auth: { persistSession: false, autoRefreshToken: false, storageKey: `checkout-test-${Math.random()}` },
    global: { fetch: async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? "GET";
      const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
      if (storeError) return reply({ code: "XX000", message: storeError }, 500);
      if (method === "POST") {
        if (reservation) return reply({ code: "23505", message: "duplicate account reservation" }, 409);
        const body = JSON.parse(String(init?.body)) as Attempt;
        reservation = { ...body, session_id: null, created_at: new Date().toISOString() };
        return reply(reservation, 201);
      }
      const matches = reservation && [...url.searchParams].every(([key, value]) =>
        key === "select" || value === `eq.${reservation?.[key as keyof Attempt]}`);
      if (!matches) return reply({ code: "PGRST116", message: "no row" }, 406);
      if (method === "PATCH") {
        if (saveError) return reply({ message: "save unavailable" }, 500);
        reservation = { ...reservation!, ...JSON.parse(String(init?.body)) };
      }
      if (method === "DELETE") {
        const old = reservation;
        reservation = null;
        return reply([old]);
      }
      return reply(reservation);
    } },
  });
}

describe("POST /api/checkout/founding", () => {
  let POST: (request: Request) => Promise<Response>;

  afterEach(() => { vi.unstubAllEnvs(); });

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("STRIPE_SECRET_KEY", "rk_test_not_a_real_key");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_synthetic");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-admin-key");
    vi.stubEnv("NEXT_PUBLIC_FOUNDING_CHECKOUT_URL", "https://buy.stripe.com/synthetic");
    vi.stubEnv("STRIPE_FOUNDING_PRICE_ID", "price_test");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://personaudit.com");
    getUser.mockResolvedValue({ data: { user: { id: "user-1", email: "buyer@example.com" } } });
    reservation = null;
    storeError = null;
    saveError = false;
    checkoutStatus = "open";
    subscriptionStatus = "active";
    getAdmin.mockReturnValue(syntheticAdmin());
    createSession.mockImplementation(async (params: { metadata: Record<string, string> }) => ({
      id: "cs_synthetic", status: "open", url: "https://checkout.stripe.com/c/pay/test", metadata: params.metadata,
    }));
    retrieveSession.mockImplementation(async () => ({
      id: "cs_synthetic", status: checkoutStatus, url: "https://checkout.stripe.com/c/pay/test",
      subscription: checkoutStatus === "complete" ? "sub_synthetic" : null,
      metadata: { supabase_user_id: "user-1", personaudit_checkout_attempt: reservation?.id },
    }));
    retrieveSubscription.mockImplementation(async () => ({ status: subscriptionStatus }));
    readProfile.mockResolvedValue({ data: { plan: "free", stripe_customer_id: null }, error: null });
    ({ POST } = await import("@/app/api/checkout/founding/route"));
  });

  it.each(["NEXT_PUBLIC_FOUNDING_CHECKOUT_URL", "STRIPE_SECRET_KEY", "STRIPE_FOUNDING_PRICE_ID", "STRIPE_WEBHOOK_SECRET", "SUPABASE_SERVICE_ROLE_KEY"])("does not start checkout without %s", async (key) => {
    vi.stubEnv(key, "");
    expect((await POST(new Request("https://personaudit.com/api/checkout/founding"))).status).toBe(503);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only billing configuration", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "   ");
    expect((await POST(new Request("https://personaudit.com/api/checkout/founding"))).status).toBe(503);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("creates an authenticated subscription checkout linked to the buyer", async () => {
    const response = await POST(new Request("https://personaudit.com/api/checkout/founding", { method: "POST" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "https://checkout.stripe.com/c/pay/test" });
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({
      mode: "subscription",
      customer_email: "buyer@example.com",
      metadata: expect.objectContaining({ personaudit_plan: "founding", supabase_user_id: "user-1" }),
      line_items: [{ price: "price_test", quantity: 1 }],
    }), expect.objectContaining({ idempotencyKey: expect.any(String) }));
  });

  it("reuses one live checkout when a free account opens checkout twice", async () => {
    const first = await POST(new Request("https://personaudit.com/api/checkout/founding"));
    const second = await POST(new Request("https://personaudit.com/api/checkout/founding"));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual(await first.json());
    expect(createSession).toHaveBeenCalledTimes(1);
  });

  it("uses one provider idempotency key for simultaneous checkout requests", async () => {
    let release: () => void = () => {};
    const bothCreating = new Promise<void>((resolve) => { release = resolve; });
    const providerSessions = new Map<string, string>();
    createSession.mockImplementation(async (params: { metadata: Record<string, string> }, options: { idempotencyKey: string }) => {
      expect(options.idempotencyKey).toMatch(/^checkout-/);
      providerSessions.set(options.idempotencyKey, "cs_synthetic");
      if (createSession.mock.calls.length === 2) release();
      await bothCreating;
      return { id: "cs_synthetic", status: "open", url: "https://checkout.stripe.com/c/pay/test", metadata: params.metadata };
    });
    const responses = await Promise.all([POST(new Request("https://personaudit.com/api/checkout/founding")), POST(new Request("https://personaudit.com/api/checkout/founding"))]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(providerSessions.size).toBe(1);
    expect(createSession.mock.calls[0]).toEqual(createSession.mock.calls[1]);
  });

  it("retries a lost provider response with the original key and frozen parameters", async () => {
    createSession.mockRejectedValueOnce(new Error("response lost after create"));
    expect((await POST(new Request("https://personaudit.com/api/checkout/founding"))).status).toBe(503);
    const attemptId = reservation?.id;
    vi.stubEnv("STRIPE_FOUNDING_PRICE_ID", "price_changed");
    vi.stubEnv("STRIPE_TRIAL_DAYS", "0");
    readProfile.mockResolvedValue({ data: { plan: "free", stripe_customer_id: "cus_changed" }, error: null });
    expect((await POST(new Request("https://personaudit.com/api/checkout/founding"))).status).toBe(200);
    expect(reservation?.id).toBe(attemptId);
    expect(createSession.mock.calls[0]).toEqual(createSession.mock.calls[1]);
  });

  it("retains the reservation after losing the session-id database write", async () => {
    saveError = true;
    expect((await POST(new Request("https://personaudit.com/api/checkout/founding"))).status).toBe(503);
    expect(reservation?.session_id).toBeNull();
    saveError = false;
    expect((await POST(new Request("https://personaudit.com/api/checkout/founding"))).status).toBe(200);
    expect(createSession.mock.calls[0]).toEqual(createSession.mock.calls[1]);
  });

  it("does not recreate an ambiguous session after the safe retry window", async () => {
    createSession.mockRejectedValueOnce(new Error("response lost"));
    await POST(new Request("https://personaudit.com/api/checkout/founding"));
    reservation!.created_at = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect((await POST(new Request("https://personaudit.com/api/checkout/founding"))).status).toBe(503);
    expect(createSession).toHaveBeenCalledTimes(1);
  });

  it("replaces a session only when Stripe confirms it expired", async () => {
    await POST(new Request("https://personaudit.com/api/checkout/founding"));
    const oldAttempt = reservation?.id;
    checkoutStatus = "expired";
    expect((await POST(new Request("https://personaudit.com/api/checkout/founding"))).status).toBe(200);
    expect(reservation?.id).not.toBe(oldAttempt);
    expect(createSession).toHaveBeenCalledTimes(2);
    expect(createSession.mock.calls[0]?.[1]).not.toEqual(createSession.mock.calls[1]?.[1]);
  });

  it("blocks a completed session while the plan webhook has not arrived", async () => {
    await POST(new Request("https://personaudit.com/api/checkout/founding"));
    checkoutStatus = "complete";
    expect((await POST(new Request("https://personaudit.com/api/checkout/founding"))).status).toBe(409);
    expect(createSession).toHaveBeenCalledTimes(1);
  });

  it.each(["past_due", "unpaid", "paused", "trialing", "incomplete"])("does not open another subscription while the current one is %s", async (status) => {
    await POST(new Request("https://personaudit.com/api/checkout/founding"));
    checkoutStatus = "complete";
    subscriptionStatus = status;
    expect((await POST(new Request("https://personaudit.com/api/checkout/founding"))).status).toBe(409);
    expect(createSession).toHaveBeenCalledTimes(1);
  });

  it.each(["canceled", "incomplete_expired"])("allows resubscription once Stripe confirms the old subscription is %s", async (status) => {
    await POST(new Request("https://personaudit.com/api/checkout/founding"));
    checkoutStatus = "complete";
    subscriptionStatus = status;
    expect((await POST(new Request("https://personaudit.com/api/checkout/founding"))).status).toBe(200);
    expect(createSession).toHaveBeenCalledTimes(2);
  });

  it("shares the reservation across paid tiers", async () => {
    await POST(new Request("https://personaudit.com/api/checkout/founding"));
    vi.stubEnv("STRIPE_SOLO_PRICE_ID", "price_solo");
    const { POST: solo } = await import("@/app/api/checkout/solo/route");
    expect((await solo()).status).toBe(409);
    expect(createSession).toHaveBeenCalledTimes(1);
  });

  it("does not start billing if reservation storage is unavailable", async () => {
    storeError = "synthetic database outage";
    const response = await POST(new Request("https://personaudit.com/api/checkout/founding"));
    expect(response.status).toBe(503);
    expect(createSession).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain(storeError);
  });

  it("does not start billing without the server-side reservation client", async () => {
    getAdmin.mockReturnValue(null);
    expect((await POST(new Request("https://personaudit.com/api/checkout/founding"))).status).toBe(503);
    expect(createSession).not.toHaveBeenCalled();
  });

  it.each(["pro", "team"])("does not sell another subscription to an existing %s account", async (plan) => {
    readProfile.mockResolvedValue({ data: { plan, stripe_customer_id: "cus_synthetic" }, error: null });
    expect((await POST(new Request("https://personaudit.com/api/checkout/founding"))).status).toBe(409);
    expect(createSession).not.toHaveBeenCalled();
  });

  it.each([
    { data: null, error: null },
    { data: null, error: { message: "database unavailable" } },
  ])("does not start billing when the account plan cannot be read", async (result) => {
    readProfile.mockResolvedValue(result);
    expect((await POST(new Request("https://personaudit.com/api/checkout/founding"))).status).toBe(503);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("reuses the account's existing Stripe customer", async () => {
    readProfile.mockResolvedValue({ data: { plan: "free", stripe_customer_id: "cus_synthetic" }, error: null });
    expect((await POST(new Request("https://personaudit.com/api/checkout/founding"))).status).toBe(200);
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({ customer: "cus_synthetic" }), expect.objectContaining({ idempotencyKey: expect.any(String) }));
    expect(createSession.mock.calls[0]?.[0]).not.toHaveProperty("customer_email");
  });

  it("returns a retryable response without leaking provider errors", async () => {
    createSession.mockRejectedValue(new Error("private provider detail"));
    const response = await POST(new Request("https://personaudit.com/api/checkout/founding"));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private provider detail");
  });
});
