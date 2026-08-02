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
