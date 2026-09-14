import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { proAccessHref } from "@/lib/pro-access";

describe("proAccessHref", () => {
  const original = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
    else process.env.NEXT_PUBLIC_SUPPORT_EMAIL = original;
  });

  it("falls back to the public founding page, not the owner-only waitlist", () => {
    expect(proAccessHref()).toBe("/for-agencies");
  });

  it("uses a mailto when a support address is configured", () => {
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL = "hello@personaudit.com";
    expect(proAccessHref()).toBe("mailto:hello@personaudit.com?subject=Pro%20access");
  });
});
