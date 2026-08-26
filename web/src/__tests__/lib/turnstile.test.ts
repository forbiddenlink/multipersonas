import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "@/lib/turnstile";

// Guards the public-grader bot gate against silent drift: the security value is entirely
// in the enforce-when-configured / fail-closed-on-error wiring, so pin every branch.

describe("verifyTurnstile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("skips (allows) when no secret is configured — dev/preview unblocked", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await verifyTurnstile("any-token", "1.2.3.4", undefined);
    expect(result).toEqual({ configured: false, ok: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("treats an empty-string secret as unconfigured", async () => {
    expect(await verifyTurnstile("t", undefined, "   ")).toEqual({
      configured: false,
      ok: true,
    });
  });

  it("denies when configured but the token is missing — never calls Cloudflare", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await verifyTurnstile(undefined, "1.2.3.4", "secret")).toEqual({
      configured: true,
      ok: false,
    });
    expect(await verifyTurnstile(null, "1.2.3.4", "secret")).toEqual({
      configured: true,
      ok: false,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("allows when Cloudflare confirms success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) }),
    );
    expect(await verifyTurnstile("good", "1.2.3.4", "secret")).toEqual({
      configured: true,
      ok: true,
    });
  });

  it("denies when Cloudflare reports failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false }) }),
    );
    expect(await verifyTurnstile("bad", "1.2.3.4", "secret")).toEqual({
      configured: true,
      ok: false,
    });
  });

  it("FAILS CLOSED on a non-200 siteverify response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    expect(await verifyTurnstile("x", "1.2.3.4", "secret")).toEqual({
      configured: true,
      ok: false,
    });
  });

  it("FAILS CLOSED on a network error (abuse gate, not availability)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await verifyTurnstile("x", "1.2.3.4", "secret")).toEqual({
      configured: true,
      ok: false,
    });
  });

  it("omits remoteip from the payload when the IP is unknown/missing", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", fetchSpy);
    await verifyTurnstile("good", "unknown", "secret");
    const body = fetchSpy.mock.calls[0]![1]!.body as URLSearchParams;
    expect(body.has("remoteip")).toBe(false);
    expect(body.get("response")).toBe("good");
    expect(body.get("secret")).toBe("secret");
  });
});
