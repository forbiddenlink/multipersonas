import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createAdminClient, rpc, maybeSingle } = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  rpc: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));

import { reserveSpend } from "@/lib/spend";
import { CALLER_DAILY_CALL_CAP, DAILY_MODEL_CALL_CAP, TRIAL_CALLER_DAILY_CALL_CAP } from "@/lib/limits";

const USER = "10000000-0000-4000-8000-000000000081";
const future = (): string => new Date(Date.now() + 86_400_000).toISOString();
const past = (): string => new Date(Date.now() - 86_400_000).toISOString();

beforeEach(() => {
  vi.resetAllMocks();
  const chain = { select: vi.fn(() => chain), eq: vi.fn(() => chain), maybeSingle };
  createAdminClient.mockReturnValue({ rpc, from: vi.fn(() => chain) });
  rpc.mockResolvedValue({ data: true, error: null });
  maybeSingle.mockResolvedValue({ data: { trial_ends_at: null }, error: null });
});
afterEach(() => vi.restoreAllMocks());

function reservedCallerCap(): number {
  const call = rpc.mock.calls.find(([name]) => name === "reserve_model_calls_scoped");
  return call?.[1].p_caller_cap;
}

describe("reserveSpend caller cap", () => {
  it("uses the lower trial cap while the caller is trialing", async () => {
    maybeSingle.mockResolvedValue({ data: { trial_ends_at: future() }, error: null });
    expect(await reserveSpend(1, USER)).toBe(true);
    expect(reservedCallerCap()).toBe(TRIAL_CALLER_DAILY_CALL_CAP);
    expect(rpc.mock.calls[0]![1].p_cap).toBe(DAILY_MODEL_CALL_CAP);
  });

  it("uses the normal cap for a paying caller and after the trial ended", async () => {
    await reserveSpend(1, USER);
    expect(reservedCallerCap()).toBe(CALLER_DAILY_CALL_CAP);
    maybeSingle.mockResolvedValue({ data: { trial_ends_at: past() }, error: null });
    await reserveSpend(1, USER);
    expect(rpc.mock.calls[1]![1].p_caller_cap).toBe(CALLER_DAILY_CALL_CAP);
  });

  it("does not look up a profile for anonymous callers", async () => {
    await reserveSpend(1, "anon:203.0.113.9");
    expect(maybeSingle).not.toHaveBeenCalled();
    expect(reservedCallerCap()).toBe(CALLER_DAILY_CALL_CAP);
  });

  it("falls back to the lower cap when the profile read fails", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: "boom" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    await reserveSpend(1, USER);
    expect(reservedCallerCap()).toBe(TRIAL_CALLER_DAILY_CALL_CAP);
  });

  it.each(["42703", "PGRST204"])("treats a missing trial_ends_at column (%s) as not trialing", async (code) => {
    maybeSingle.mockResolvedValue({ data: null, error: { code, message: "column profiles.trial_ends_at does not exist" } });
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    await reserveSpend(1, USER);
    expect(reservedCallerCap()).toBe(CALLER_DAILY_CALL_CAP);
    expect(logged).not.toHaveBeenCalled();
  });

  it("keeps the lower cap for any other lookup error", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { code: "57014", message: "timeout" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    await reserveSpend(1, USER);
    expect(reservedCallerCap()).toBe(TRIAL_CALLER_DAILY_CALL_CAP);
  });

  it("still refuses when the reservation RPC errors or is declined", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({ data: null, error: { message: "down" } });
    expect(await reserveSpend(1, USER)).toBe(false);
    rpc.mockResolvedValue({ data: false, error: null });
    expect(await reserveSpend(1, USER)).toBe(false);
  });
});
