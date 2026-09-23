import { describe, expect, it, vi } from "vitest";
import type { BrowserContext, Page } from "playwright";
import { applyNetworkConditions, NETWORK_PROFILES } from "./network-conditions.js";

function fixture() {
  const send = vi.fn(async () => ({}));
  const newCDPSession = vi.fn(async () => ({ send }));
  const context = { newCDPSession } as unknown as BrowserContext;
  const page = {} as Page;
  return { context, page, send, newCDPSession };
}

describe("network conditions", () => {
  it("does not change unthrottled runs", async () => {
    const { context, page, newCDPSession } = fixture();
    await applyNetworkConditions(context, page, "fast");
    expect(newCDPSession).not.toHaveBeenCalled();
  });

  it.each(["3g", "slow-3g"] as const)("installs %s limits and matching browser state", async (speed) => {
    const { context, page, send } = fixture();
    await applyNetworkConditions(context, page, speed);
    expect(send.mock.calls).toEqual([
      ["Network.enable"],
      ["Network.setCacheDisabled", { cacheDisabled: true }],
      ["Network.setBypassServiceWorker", { bypass: true }],
      ["Network.emulateNetworkConditionsByRule", {
        matchedNetworkConditions: [{ urlPattern: "", ...NETWORK_PROFILES[speed], connectionType: "cellular3g" }],
      }],
      ["Network.overrideNetworkState", { offline: false, ...NETWORK_PROFILES[speed], connectionType: "cellular3g" }],
    ]);
  });

  it("fails rather than silently running without the promised condition", async () => {
    const { context, page, send } = fixture();
    send.mockRejectedValue(new Error("emulation unavailable"));
    await expect(applyNetworkConditions(context, page, "slow-3g")).rejects.toThrow("emulation unavailable");
  });
});
