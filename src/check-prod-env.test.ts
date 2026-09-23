import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("../scripts/check-prod-env.mjs", import.meta.url));
const checkoutEnv = {
  NEXT_PUBLIC_FOUNDING_CHECKOUT_URL: "https://buy.stripe.com/synthetic",
  STRIPE_SECRET_KEY: "synthetic-secret",
  STRIPE_FOUNDING_PRICE_ID: "price_synthetic",
  STRIPE_WEBHOOK_SECRET: "synthetic-webhook-secret",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-role",
};

function check(env: Record<string, string>): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, [script], { env, encoding: "utf8" });
}

describe("founding checkout configuration", () => {
  it("permits waitlist-only configuration", () => {
    expect(check({}).status).toBe(0);
  });

  it("accepts complete checkout and fulfillment configuration", () => {
    expect(check(checkoutEnv).status).toBe(0);
  });

  it.each(["STRIPE_SECRET_KEY", "STRIPE_FOUNDING_PRICE_ID", "STRIPE_WEBHOOK_SECRET", "SUPABASE_SERVICE_ROLE_KEY"])(
    "rejects an enabled checkout without %s without printing secrets", (key) => {
      const result = check({ ...checkoutEnv, [key]: "" });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`${key} is required`);
      expect(result.stderr).not.toContain("synthetic-secret");
      expect(result.stderr).not.toContain("synthetic-webhook-secret");
      expect(result.stderr).not.toContain("synthetic-service-role");
    },
  );

  it("rejects partial server configuration even when the public offer is hidden", () => {
    const result = check({ STRIPE_FOUNDING_PRICE_ID: "price_synthetic" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("STRIPE_SECRET_KEY is required");
    expect(result.stderr).toContain("STRIPE_WEBHOOK_SECRET is required");
  });
});
