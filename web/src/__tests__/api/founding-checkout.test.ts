import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, createSession } = vi.hoisted(() => ({
  getUser: vi.fn(),
  createSession: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser } })),
}));

vi.mock("stripe", () => ({
  default: class Stripe {
    checkout = { sessions: { create: createSession } };
  },
}));

describe("POST /api/checkout/founding", () => {
  let POST: (request: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "rk_test_not_a_real_key";
    process.env.STRIPE_FOUNDING_PRICE_ID = "price_test";
    process.env.NEXT_PUBLIC_SITE_URL = "https://personaudit.com";
    getUser.mockResolvedValue({ data: { user: { id: "user-1", email: "buyer@example.com" } } });
    createSession.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/test" });
    ({ POST } = await import("@/app/api/checkout/founding/route"));
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
});
