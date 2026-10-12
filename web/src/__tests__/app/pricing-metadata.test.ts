import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateMetadata } from "@/app/pricing/page";

beforeEach(() => {
  vi.stubEnv("STRIPE_SECRET_KEY", "synthetic");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "synthetic");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic");
});
afterEach(() => vi.unstubAllEnvs());

describe("pricing metadata matches the visible offer", () => {
  it("names $39 only when the solo checkout is open", () => {
    vi.stubEnv("STRIPE_SOLO_PRICE_ID", "price_solo");
    const open = generateMetadata();
    expect(String(open.title)).toContain("$39");
    expect(String(open.description)).toContain("$39");
  });

  it("does not advertise a price while the solo checkout is closed", () => {
    vi.stubEnv("STRIPE_SOLO_PRICE_ID", "");
    const closed = generateMetadata();
    expect(String(closed.title)).not.toContain("$");
    expect(String(closed.description)).not.toContain("$");
  });
});
