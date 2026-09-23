import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, createPortal, readProfile } = vi.hoisted(() => ({
  getUser: vi.fn(),
  createPortal: vi.fn(),
  readProfile: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
    from: () => ({ select: () => ({ eq: () => ({ single: readProfile }) }) }),
  })),
}));

vi.mock("stripe", () => ({
  default: class Stripe {
    billingPortal = { sessions: { create: createPortal } };
  },
}));

describe("POST /api/billing/portal", () => {
  let POST: () => Promise<Response>;

  afterEach(() => { vi.unstubAllEnvs(); });

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("STRIPE_SECRET_KEY", "rk_test_not_a_real_key");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://personaudit.com");
    getUser.mockResolvedValue({ data: { user: { id: "user-1", email: "buyer@example.com" } } });
    readProfile.mockResolvedValue({ data: { stripe_customer_id: "cus_synthetic" }, error: null });
    createPortal.mockResolvedValue({ url: "https://billing.stripe.com/session/test" });
    ({ POST } = await import("@/app/api/billing/portal/route"));
  });

  it("requires a signed-in account", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await POST()).status).toBe(401);
    expect(createPortal).not.toHaveBeenCalled();
  });

  it("stays closed when the Stripe key is missing or blank", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "   ");
    expect((await POST()).status).toBe(503);
    expect(createPortal).not.toHaveBeenCalled();
  });

  it("does not open a portal for an account with no Stripe customer", async () => {
    readProfile.mockResolvedValue({ data: { stripe_customer_id: "  " }, error: null });
    const response = await POST();
    expect(response.status).toBe(409);
    expect(createPortal).not.toHaveBeenCalled();
  });

  it("returns the caller to settings after managing billing", async () => {
    const response = await POST();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "https://billing.stripe.com/session/test" });
    expect(createPortal).toHaveBeenCalledWith({
      customer: "cus_synthetic",
      return_url: "https://personaudit.com/settings",
    });
  });

  it("hides provider errors", async () => {
    createPortal.mockRejectedValue(new Error("portal configuration secret"));
    const response = await POST();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret");
  });
});
