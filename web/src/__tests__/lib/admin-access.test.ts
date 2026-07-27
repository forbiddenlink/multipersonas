import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isAdminEmail } from "@/lib/admin-access";

describe("isAdminEmail", () => {
  const original = process.env.ADMIN_EMAILS;
  beforeEach(() => {
    delete process.env.ADMIN_EMAILS;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = original;
  });

  it("returns false for everyone when ADMIN_EMAILS is unset (safe default)", () => {
    expect(isAdminEmail("anyone@example.com")).toBe(false);
  });

  it("returns false for null/undefined/empty email", () => {
    process.env.ADMIN_EMAILS = "owner@example.com";
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail("")).toBe(false);
  });

  it("matches an allowlisted email case-insensitively and trimmed", () => {
    process.env.ADMIN_EMAILS = "Owner@Example.com";
    expect(isAdminEmail("owner@example.com")).toBe(true);
    expect(isAdminEmail("  OWNER@EXAMPLE.COM  ")).toBe(true);
  });

  it("rejects an email not on the list", () => {
    process.env.ADMIN_EMAILS = "owner@example.com";
    expect(isAdminEmail("someone-else@example.com")).toBe(false);
  });

  it("supports multiple comma-separated emails with stray whitespace", () => {
    process.env.ADMIN_EMAILS = "a@x.com, b@y.com ,c@z.com";
    expect(isAdminEmail("b@y.com")).toBe(true);
    expect(isAdminEmail("c@z.com")).toBe(true);
    expect(isAdminEmail("d@w.com")).toBe(false);
  });
});
