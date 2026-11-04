/**
 * Trustworthy client IP for rate limiting.
 *
 * The platform (Vercel) sets `x-real-ip` to the real client address. The LEFTMOST
 * `x-forwarded-for` entry is client-controlled (the client sends it; the platform
 * appends the real IP after), so keying a rate limit on it lets an anon caller mint a
 * fresh bucket per request. Prefer `x-real-ip`; fall back to the RIGHTMOST XFF hop
 * (closest to us), never the first.
 */
export function getClientIP(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff.split(",").map((p) => p.trim()).filter(Boolean);
    return hops[hops.length - 1] || "unknown";
  }
  return "unknown";
}

/**
 * Rate-limit bucket for a client IP. An IPv6 client usually controls a whole /64, so
 * keying on the full address lets one host rotate through unlimited buckets. IPv6 folds to
 * its /64 prefix; IPv4, IPv4-mapped IPv6 and anything unparseable pass through unchanged.
 * Use only for rate-limit keys: Turnstile and logs keep the exact address.
 */
export function rateLimitIP(ip: string): string {
  const addr = ip.trim().toLowerCase().replace(/^\[|\]$/g, "").split("%")[0]!;
  if (!addr.includes(":") || addr.includes(".")) return ip;
  const halves = addr.split("::");
  if (halves.length > 2) return ip;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return ip;
  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  if (!groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return ip;
  return `${groups.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, "")).join(":")}::/64`;
}
