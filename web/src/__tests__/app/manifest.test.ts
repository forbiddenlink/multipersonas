import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { PALETTE } from "@/lib/og-palette";

describe("web manifest", () => {
  const m = manifest();

  it("matches the desk token", () => {
    expect(m.background_color).toBe(PALETTE.desk);
    expect(m.theme_color).toBe(PALETTE.desk);
  });

  it("declares installable PNG icons, including a maskable 512", () => {
    const sizes = (m.icons ?? []).filter((i) => i.type === "image/png");
    expect(sizes.some((i) => i.sizes === "192x192")).toBe(true);
    expect(sizes.some((i) => i.sizes === "512x512" && i.purpose === "any")).toBe(true);
    expect(sizes.some((i) => i.sizes === "512x512" && i.purpose === "maskable")).toBe(true);
  });

  it("points every icon at a file that exists in public/ or app/", () => {
    for (const icon of m.icons ?? []) {
      const file = icon.src === "/icon.svg" ? join("src/app/icon.svg") : join("public", icon.src);
      expect(existsSync(join(process.cwd(), file)), icon.src).toBe(true);
    }
  });
});
