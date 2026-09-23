import type { BrowserContext, Page } from "playwright";
import type { Persona } from "../personas/types.js";

// Reproducible throttling profiles, not a simulation of a particular carrier.
// Throughput is bytes/second; latency is milliseconds before response headers.
export const NETWORK_PROFILES = {
  "3g": { latency: 100, downloadThroughput: 750_000 / 8, uploadThroughput: 250_000 / 8 },
  "slow-3g": { latency: 400, downloadThroughput: 400_000 / 8, uploadThroughput: 400_000 / 8 },
} as const;

export async function applyNetworkConditions(
  context: BrowserContext,
  page: Page,
  speed: Persona["connectionSpeed"],
): Promise<void> {
  if (speed === "fast") return;
  const profile = NETWORK_PROFILES[speed];
  const session = await context.newCDPSession(page);
  // Fail the run if emulation cannot be installed, rather than labeling an
  // unthrottled run as slow. The session lives until its page/context closes.
  await session.send("Network.enable");
  await session.send("Network.setCacheDisabled", { cacheDisabled: true });
  await session.send("Network.setBypassServiceWorker", { bypass: true });
  await session.send("Network.emulateNetworkConditionsByRule", {
    matchedNetworkConditions: [{ urlPattern: "", ...profile, connectionType: "cellular3g" }],
  });
  await session.send("Network.overrideNetworkState", {
    offline: false, ...profile, connectionType: "cellular3g",
  });
}
