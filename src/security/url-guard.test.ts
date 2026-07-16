import { describe, it, expect } from "vitest";
import { assertUrlAllowed, isPrivateAddress, isInScope, BlockedUrlError } from "./url-guard.js";

/** Stub resolver so tests never touch real DNS. */
const resolvesTo = (...addresses: string[]) => async () => addresses;

async function blocked(url: string, resolve?: () => Promise<string[]>) {
  try {
    await assertUrlAllowed(url, resolve ? { resolveHost: resolve } : {});
    return false;
  } catch (e) {
    expect(e).toBeInstanceOf(BlockedUrlError);
    return true;
  }
}

describe("isPrivateAddress", () => {
  it("blocks IPv4 loopback, RFC1918, and link-local", () => {
    for (const ip of ["127.0.0.1", "127.1.2.3", "10.0.0.1", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "0.0.0.0"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });

  it("blocks CGNAT, multicast, reserved, and broadcast", () => {
    for (const ip of ["100.64.0.1", "224.0.0.1", "240.0.0.1", "255.255.255.255", "198.18.0.1"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });

  it("allows ordinary public IPv4", () => {
    for (const ip of ["1.1.1.1", "8.8.8.8", "93.184.216.34", "172.32.0.1", "11.0.0.1"]) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });

  it("blocks IPv6 loopback, ULA, link-local, multicast", () => {
    for (const ip of ["::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "ff02::1"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });

  it("blocks IPv4-mapped IPv6 wrapping a private v4 — the ::ffff: bypass", () => {
    for (const ip of ["::ffff:127.0.0.1", "::ffff:169.254.169.254", "::ffff:10.0.0.1"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });

  it("blocks NAT64 and 6to4 wrappers around private v4", () => {
    expect(isPrivateAddress("64:ff9b::169.254.169.254")).toBe(true);
    expect(isPrivateAddress("2002:a9fe:a9fe::1")).toBe(true); // 6to4 wrapping 169.254.169.254
  });

  it("allows public IPv6", () => {
    expect(isPrivateAddress("2606:4700:4700::1111")).toBe(false);
    expect(isPrivateAddress("::ffff:8.8.8.8")).toBe(false);
  });

  it("treats a non-IP string as unsafe", () => {
    expect(isPrivateAddress("example.com")).toBe(true);
    expect(isPrivateAddress("garbage")).toBe(true);
  });
});

describe("assertUrlAllowed — scheme and shape", () => {
  it("rejects non-http(s) schemes", async () => {
    expect(await blocked("file:///etc/passwd")).toBe(true);
    expect(await blocked("gopher://example.com/")).toBe(true);
    expect(await blocked("javascript:alert(1)")).toBe(true);
  });

  it("rejects unparseable input", async () => {
    expect(await blocked("not a url")).toBe(true);
  });

  it("rejects embedded credentials", async () => {
    expect(await blocked("https://user:pass@example.com/", resolvesTo("93.184.216.34"))).toBe(true);
  });
});

describe("assertUrlAllowed — literal IPs", () => {
  it("blocks loopback and metadata literals", async () => {
    expect(await blocked("http://127.0.0.1/")).toBe(true);
    expect(await blocked("http://169.254.169.254/latest/meta-data/")).toBe(true);
    expect(await blocked("http://[::1]/")).toBe(true);
  });

  it("blocks the bracketed IPv4-mapped metadata address", async () => {
    // This is the exact form that defeated the old hostname regex.
    expect(await blocked("http://[::ffff:169.254.169.254]/")).toBe(true);
  });

  it("blocks alternate IPv4 encodings via WHATWG canonicalization", async () => {
    // new URL() normalizes these to 127.0.0.1 before we ever see them.
    expect(await blocked("http://2130706433/")).toBe(true);
    expect(await blocked("http://0177.0.0.1/")).toBe(true);
    expect(await blocked("http://0x7f.0.0.1/")).toBe(true);
  });

  it("allows a public literal", async () => {
    const url = await assertUrlAllowed("https://1.1.1.1/");
    expect(url.hostname).toBe("1.1.1.1");
  });
});

describe("assertUrlAllowed — DNS resolution", () => {
  it("blocks a public hostname that resolves to loopback (localtest.me)", async () => {
    expect(await blocked("http://localtest.me/", resolvesTo("127.0.0.1"))).toBe(true);
  });

  it("blocks a hostname resolving to cloud metadata (metadata.google.internal)", async () => {
    expect(await blocked("http://metadata.google.internal/", resolvesTo("169.254.169.254"))).toBe(true);
  });

  it("blocks if ANY resolved address is private, not just the first", async () => {
    expect(await blocked("http://split-horizon.example/", resolvesTo("93.184.216.34", "127.0.0.1"))).toBe(true);
  });

  it("blocks when the host does not resolve", async () => {
    const explode = async () => {
      throw new Error("ENOTFOUND");
    };
    expect(await blocked("http://nope.invalid/", explode)).toBe(true);
  });

  it("blocks on an empty answer", async () => {
    expect(await blocked("http://empty.example/", resolvesTo())).toBe(true);
  });

  it("allows a hostname resolving only to public addresses", async () => {
    const url = await assertUrlAllowed("https://example.com/path", {
      resolveHost: resolvesTo("93.184.216.34"),
    });
    expect(url.href).toBe("https://example.com/path");
  });
});

describe("allowPrivate — CLI escape hatch", () => {
  it("permits loopback and private targets when the caller owns them", async () => {
    // The CLI's primary use case: scanning your own app on localhost.
    for (const url of ["http://localhost:3000/", "http://127.0.0.1:3000/", "http://192.168.1.10/"]) {
      const parsed = await assertUrlAllowed(url, { allowPrivate: true });
      expect(parsed.protocol).toBe("http:");
    }
  });

  it("still enforces scheme — allowPrivate is not a general bypass", async () => {
    expect(await blocked("file:///etc/passwd")).toBe(true);
    await expect(assertUrlAllowed("file:///etc/passwd", { allowPrivate: true })).rejects.toThrow(
      BlockedUrlError,
    );
  });

  it("still rejects embedded credentials", async () => {
    await expect(
      assertUrlAllowed("http://user:pass@127.0.0.1/", { allowPrivate: true }),
    ).rejects.toThrow(BlockedUrlError);
  });

  it("defaults to OFF — omitting the option must never open the hole", async () => {
    expect(await blocked("http://169.254.169.254/")).toBe(true);
    expect(await blocked("http://localhost/")).toBe(true);
    await expect(assertUrlAllowed("http://169.254.169.254/", {})).rejects.toThrow(BlockedUrlError);
  });
});

describe("isInScope — the audit must stay on the site it was pointed at", () => {
  // Regression: dogfooding on 2026-07-15, the agent hit a login wall on
  // http://localhost:3000, followed a vendor link out to the public marketing
  // site, and reported findings about ITS pricing page in the customer's report.
  const target = "http://localhost:3000";

  it("allows other paths on the target", () => {
    expect(isInScope("http://localhost:3000/auth/login", target)).toBe(true);
    expect(isInScope("http://localhost:3000/browse/databases?x=1#f", target)).toBe(true);
  });

  it("refuses the outbound link that caused the wrong-site report", () => {
    expect(isInScope("https://www.metabase.com/", target)).toBe(false);
    expect(isInScope("https://www.metabase.com/pricing", target)).toBe(false);
  });

  it("treats a different port or scheme as a different site", () => {
    expect(isInScope("http://localhost:3001/", target)).toBe(false);
    expect(isInScope("https://localhost:3000/", target)).toBe(false);
  });

  it("does not let a sibling subdomain in", () => {
    expect(isInScope("https://www.example.com/", "https://app.example.com")).toBe(false);
    expect(isInScope("https://app.example.com/x", "https://app.example.com")).toBe(true);
  });

  it("is not fooled by the target appearing inside the URL", () => {
    expect(isInScope("https://evil.com/?next=http://localhost:3000", target)).toBe(false);
    expect(isInScope("https://localhost:3000.evil.com/", target)).toBe(false);
  });

  it("refuses garbage rather than defaulting open", () => {
    expect(isInScope("not a url", target)).toBe(false);
    expect(isInScope("", target)).toBe(false);
  });
});
