import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, createSession, readProfile } = vi.hoisted(() => ({
  getUser: vi.fn(),
  createSession: vi.fn(),
  readProfile: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser }, from: () => ({ select: () => ({ eq: () => ({ single: readProfile }) }) }) })),
}));

vi.mock("stripe", () => ({
  default: class Stripe {
    checkout = { sessions: { create: createSession } };
  },
}));

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
    createSession.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/test" });
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
      metadata: { personaudit_plan: "founding", supabase_user_id: "user-1" },
      line_items: [{ price: "price_test", quantity: 1 }],
    }));
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
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({ customer: "cus_synthetic" }));
    expect(createSession.mock.calls[0]?.[0]).not.toHaveProperty("customer_email");
  });

  it("returns a retryable response without leaking provider errors", async () => {
    createSession.mockRejectedValue(new Error("private provider detail"));
    const response = await POST(new Request("https://personaudit.com/api/checkout/founding"));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private provider detail");
  });
});
