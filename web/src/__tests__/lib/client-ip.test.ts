import { describe, expect, it } from "vitest";
import { rateLimitIP } from "@/lib/client-ip";

describe("rateLimitIP", () => {
  it("folds two addresses in one IPv6 /64 into the same bucket", () => {
    expect(rateLimitIP("2001:db8:abcd:12:1::1")).toBe("2001:db8:abcd:12::/64");
    expect(rateLimitIP("2001:0db8:abcd:0012:ffff:ffff:ffff:ffff")).toBe("2001:db8:abcd:12::/64");
  });

  it("keeps different /64s apart and expands a leading ::", () => {
    expect(rateLimitIP("2001:db8:abcd:13::1")).toBe("2001:db8:abcd:13::/64");
    expect(rateLimitIP("::1")).toBe("0:0:0:0::/64");
  });

  it("passes IPv4, IPv4-mapped and unparseable values through", () => {
    expect(rateLimitIP("203.0.113.7")).toBe("203.0.113.7");
    expect(rateLimitIP("::ffff:203.0.113.7")).toBe("::ffff:203.0.113.7");
    expect(rateLimitIP("unknown")).toBe("unknown");
    expect(rateLimitIP("1::2::3")).toBe("1::2::3");
  });
});
