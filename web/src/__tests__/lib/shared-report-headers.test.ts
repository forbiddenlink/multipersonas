import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";

describe("share link response headers", () => {
  it("sets no-store, no-referrer and noindex for /r/:token", async () => {
    const entries = (await nextConfig.headers?.()) ?? [];
    const entry = entries.find((e) => e.source === "/r/:token");
    expect(entry).toBeDefined();
    const byKey = Object.fromEntries(entry!.headers.map((h) => [h.key, h.value]));
    expect(byKey["Cache-Control"]).toBe("no-store");
    expect(byKey["Referrer-Policy"]).toBe("no-referrer");
    expect(byKey["X-Robots-Tag"]).toContain("noindex");
  });
});
