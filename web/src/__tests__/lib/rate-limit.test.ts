import { afterEach, describe, expect, it, vi } from "vitest";
import { consumeRateLimit } from "@/lib/rate-limit";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));

afterEach(() => vi.clearAllMocks());

describe("durable rate-limit failures", () => {
  it("refuses writes when the limiter RPC fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "synthetic outage" } });
    const result = await consumeRateLimit("synthetic-caller", "waitlist");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });
});
