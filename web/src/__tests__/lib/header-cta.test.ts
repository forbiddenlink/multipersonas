import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { headerCta } from "@/lib/header-cta";

describe("headerCta", () => {
  it("is the checkout CTA on the agency page when founding checkout is open", () => {
    expect(headerCta("waitlist", true).label).toBe("Join founding access");
  });

  it("is the waitlist CTA when founding checkout is closed", () => {
    expect(headerCta("waitlist", false).label).toBe("Request founding access");
  });

  it("does not vary the grade/audit CTAs with checkout state", () => {
    expect(headerCta("audit", true)).toEqual(headerCta("audit", false));
    expect(headerCta("grade", true)).toEqual(headerCta("grade", false));
  });
});

describe("for-agencies page keeps one primary CTA", () => {
  const src = fs.readFileSync(path.join(process.cwd(), "src/app/for-agencies/page.tsx"), "utf-8");
  it("demotes the waitlist to a secondary 'Not ready? Get notified' path when checkout is open", () => {
    expect(src).toMatch(/Not ready\? Get notified/);
  });
});
