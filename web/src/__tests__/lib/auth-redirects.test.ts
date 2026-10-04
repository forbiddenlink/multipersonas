import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { AUTH_REDIRECTS } from "@/lib/auth-redirects";

describe("auth route redirects", () => {
  const bySource = new Map<string, string>(AUTH_REDIRECTS.map((r) => [r.source, r.destination]));

  it("sends every sign-up guess to /auth/signup", () => {
    for (const s of ["/auth/sign-up", "/signup", "/sign-up", "/register"]) {
      expect(bySource.get(s), s).toBe("/auth/signup");
    }
  });

  it("sends /login to /auth/login", () => {
    expect(bySource.get("/login")).toBe("/auth/login");
  });

  it("is permanent and only targets routes that exist", () => {
    for (const r of AUTH_REDIRECTS) {
      expect(r.permanent).toBe(true);
      const dir = path.join(process.cwd(), "src/app", r.destination);
      expect(fs.existsSync(path.join(dir, "page.tsx")), r.destination).toBe(true);
    }
  });

  it("has no source that is also a redirect destination (no loops)", () => {
    const dests = new Set<string>(AUTH_REDIRECTS.map((r) => r.destination));
    for (const r of AUTH_REDIRECTS) expect(dests.has(r.source)).toBe(false);
  });
});
