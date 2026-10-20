import { describe, expect, it } from "vitest";
import { bearerMatches } from "@/lib/cron-auth";

// bearerMatches is the only check in front of the scheduled-scan routes, which spend
// money and send email on behalf of every account.

const SECRET = "s3cret-value-for-tests";

describe("bearerMatches", () => {
  it("accepts the exact Bearer header", () => {
    expect(bearerMatches(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it.each([
    ["an empty header", ""],
    ["the secret without the scheme", SECRET],
    ["a lowercase scheme", `bearer ${SECRET}`],
    ["a wrong secret", "Bearer not-it"],
    ["a prefix of the secret", `Bearer ${SECRET.slice(0, -1)}`],
    ["the secret plus a suffix", `Bearer ${SECRET}x`],
    ["a different scheme", `Basic ${SECRET}`],
  ])("rejects %s", (_label, header) => {
    expect(bearerMatches(header, SECRET)).toBe(false);
  });
});
