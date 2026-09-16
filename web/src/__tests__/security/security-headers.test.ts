import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const config = fs.readFileSync(path.join(process.cwd(), "next.config.ts"), "utf-8");

describe("production security headers", () => {
  it("enforces a CSP while allowing the configured human-verification provider", () => {
    expect(config).toContain('key: "Content-Security-Policy"');
    expect(config).not.toContain('key: "Content-Security-Policy-Report-Only"');
    expect(config).toContain("https://challenges.cloudflare.com");
    expect(config).toContain("frame-src 'self' https://challenges.cloudflare.com");
  });

  it("lets the browser reach the configured Supabase origin, not only *.supabase.co", () => {
    // A local stack (http://127.0.0.1:54321) or custom domain must not be blocked from sign-in.
    expect(config).toMatch(/new URL\(process\.env\.NEXT_PUBLIC_SUPABASE_URL/);
    expect(config).toMatch(/connect-src 'self' \$\{supabaseOrigin\}/);
  });
});
