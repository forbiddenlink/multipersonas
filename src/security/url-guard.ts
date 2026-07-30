import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * SSRF guard. Every navigation in this codebase must pass through here.
 *
 * The threat is specific to what this product does: we point a browser at a
 * URL a stranger supplied, and we let an LLM that has read that stranger's
 * page decide where to navigate next. Both the URL and the agent's intent are
 * attacker-influenced, so hostname string matching is not a defense — the
 * check has to happen against the RESOLVED address.
 */

export class BlockedUrlError extends Error {
  constructor(
    message: string,
    readonly url: string,
  ) {
    super(message);
    this.name = "BlockedUrlError";
  }
}

/** Reserved/private IPv4 CIDRs. */
const V4_BLOCKS: Array<[string, number]> = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // RFC1918
  ["100.64.0.0", 10], // CGNAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local — AWS/GCP/Azure IMDS lives at 169.254.169.254
  ["172.16.0.0", 12], // RFC1918
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.88.99.0", 24], // 6to4 relay anycast
  ["192.168.0.0", 16], // RFC1918
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved (includes 255.255.255.255)
];

function v4ToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    throw new Error(`Not an IPv4 address: ${ip}`);
  }
  // >>> 0 keeps it unsigned; bitwise ops in JS are signed 32-bit.
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
}

function isPrivateV4(ip: string): boolean {
  const addr = v4ToInt(ip);
  return V4_BLOCKS.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (addr & mask) >>> 0 === (v4ToInt(base) & mask) >>> 0;
  });
}

/**
 * Expand an IPv6 address to its 8 hextets.
 * Handles :: compression and IPv4-mapped tails (::ffff:127.0.0.1).
 */
function v6Hextets(ip: string): number[] {
  let addr = ip.trim().replace(/^\[|\]$/g, "");
  const zone = addr.indexOf("%");
  if (zone !== -1) addr = addr.slice(0, zone);

  // An embedded IPv4 tail contributes the final two hextets.
  let tail: number[] = [];
  const lastColon = addr.lastIndexOf(":");
  const maybeV4 = addr.slice(lastColon + 1);
  if (maybeV4.includes(".")) {
    const n = v4ToInt(maybeV4);
    tail = [(n >>> 16) & 0xffff, n & 0xffff];
    addr = addr.slice(0, lastColon + 1);
    if (addr.endsWith("::")) addr = addr.slice(0, -1);
    else if (addr.endsWith(":")) addr = addr.slice(0, -1);
  }

  const [head, rest] = addr.split("::") as [string, string | undefined];
  const headParts = head ? head.split(":").filter(Boolean).map((h) => parseInt(h, 16)) : [];
  const restParts = rest ? rest.split(":").filter(Boolean).map((h) => parseInt(h, 16)) : [];

  if (rest === undefined) {
    const all = [...headParts, ...tail];
    return all;
  }
  const fill = 8 - headParts.length - restParts.length - tail.length;
  return [...headParts, ...Array(Math.max(0, fill)).fill(0), ...restParts, ...tail];
}

function isPrivateV6(ip: string): boolean {
  const h = v6Hextets(ip);
  if (h.length !== 8 || h.some((x) => !Number.isInteger(x))) return true; // unparseable → refuse

  const allZero = h.every((x) => x === 0);
  if (allZero) return true; // ::
  if (h.slice(0, 7).every((x) => x === 0) && h[7] === 1) return true; // ::1

  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible — judge the embedded v4.
  // This is the [::ffff:169.254.169.254] bypass.
  const v4Embedded =
    (h.slice(0, 5).every((x) => x === 0) && h[5] === 0xffff) ||
    (h.slice(0, 6).every((x) => x === 0) && (h[6] !== 0 || h[7] !== 0));
  if (v4Embedded) {
    const v4 = `${(h[6]! >> 8) & 0xff}.${h[6]! & 0xff}.${(h[7]! >> 8) & 0xff}.${h[7]! & 0xff}`;
    return isPrivateV4(v4);
  }

  // NAT64 (64:ff9b::/96) also wraps a v4 destination.
  if (h[0] === 0x64 && h[1] === 0xff9b && h[2] === 0 && h[3] === 0 && h[4] === 0 && h[5] === 0) {
    const v4 = `${(h[6]! >> 8) & 0xff}.${h[6]! & 0xff}.${(h[7]! >> 8) & 0xff}.${h[7]! & 0xff}`;
    return isPrivateV4(v4);
  }

  // 6to4 (2002::/16) embeds a v4 in the next 32 bits.
  if (h[0] === 0x2002) {
    const v4 = `${(h[1]! >> 8) & 0xff}.${h[1]! & 0xff}.${(h[2]! >> 8) & 0xff}.${h[2]! & 0xff}`;
    return isPrivateV4(v4);
  }

  if ((h[0]! & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if ((h[0]! & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((h[0]! & 0xffc0) === 0xfec0) return true; // fec0::/10 site-local (deprecated)
  if ((h[0]! & 0xff00) === 0xff00) return true; // ff00::/8 multicast

  return false;
}

/** True if the literal IP address is private, reserved, or otherwise not a public destination. */
export function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateV4(ip);
  if (family === 6) return isPrivateV6(ip);
  return true; // not an IP literal → caller must resolve first
}

export interface UrlGuardOptions {
  /** Skip DNS resolution. Only for unit tests — never in the request path. */
  resolveHost?: (hostname: string) => Promise<string[]>;

  /**
   * Permit private/loopback destinations.
   *
   * The threat model differs by caller, and collapsing them breaks one or the
   * other:
   *
   * - **CLI**: you run it on your own machine against your own site. Scanning
   *   `localhost:3000` or a staging box on the LAN is the *primary* use case, not
   *   an attack. Opt in with `--allow-private`.
   * - **Hosted service**: the URL comes from a stranger and an LLM that has read
   *   the stranger's page picks where to go next. Private destinations must stay
   *   blocked. The web route must never set this.
   *
   * Default false: safe unless a caller deliberately says otherwise.
   */
  allowPrivate?: boolean;
}

async function defaultResolve(hostname: string): Promise<string[]> {
  const records = await lookup(hostname, { all: true });
  return records.map((r) => r.address);
}

/**
 * Validate a URL for outbound navigation.
 *
 * Resolves the hostname and rejects if ANY resolved address is private — a
 * hostname with both a public and a loopback A record must not slip through.
 *
 * Returns the parsed URL on success; throws BlockedUrlError otherwise.
 *
 * NOTE: this cannot fully close DNS rebinding. We resolve here, then Chromium
 * resolves again when it actually connects, and a hostile DNS server can answer
 * differently the second time (TOCTOU). Closing that hole requires pinning the
 * resolved IP or running the browser with an egress firewall — see the network
 * isolation note in the deployment plan. This check plus assertRequestAllowed()
 * on every in-flight request raises the bar substantially; it is not absolute.
 */
export async function assertUrlAllowed(
  rawUrl: string,
  options: UrlGuardOptions = {},
): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BlockedUrlError("Enter a full URL starting with https://", rawUrl);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new BlockedUrlError(
      `Only http and https URLs can be tested (got ${parsed.protocol}).`,
      rawUrl,
    );
  }

  if (parsed.username || parsed.password) {
    throw new BlockedUrlError("URLs with embedded credentials are not allowed.", rawUrl);
  }

  // Caller asserts it owns the target (CLI, against your own machine or staging).
  // Scheme and credential checks above still apply; only the destination check is
  // waived. Never set this from the hosted service — see UrlGuardOptions.
  if (options.allowPrivate) return parsed;

  const hostname = parsed.hostname;
  // WHATWG URL canonicalizes decimal/octal/hex IPv4 (2130706433 -> 127.0.0.1)
  // and keeps IPv6 in brackets, so a literal check here is reliable.
  const literal = hostname.startsWith("[") ? hostname.slice(1, -1) : hostname;
  if (isIP(literal)) {
    if (isPrivateAddress(literal)) {
      throw new BlockedUrlError("This URL points to a private network and can't be tested.", rawUrl);
    }
    return parsed;
  }

  // Not an IP literal: resolve, and judge every address it answers with.
  let addresses: string[];
  try {
    addresses = await (options.resolveHost ?? defaultResolve)(hostname);
  } catch {
    throw new BlockedUrlError(`Could not resolve "${hostname}".`, rawUrl);
  }

  if (addresses.length === 0) {
    throw new BlockedUrlError(`Could not resolve "${hostname}".`, rawUrl);
  }

  for (const address of addresses) {
    if (isPrivateAddress(address)) {
      throw new BlockedUrlError(
        "This URL points to a private network and can't be tested.",
        rawUrl,
      );
    }
  }

  return parsed;
}

/**
 * Is `candidate` within the audit's scope — i.e. the same origin as the target?
 *
 * An audit must stay on the site it was pointed at. Without this the agent
 * follows any outbound link it likes: pointed at a local app, it hit the login
 * wall, followed a vendor link to the public marketing site, and reported
 * findings about *that* site's pricing page as if they were the customer's
 * (observed 2026-07-15). A report about the wrong website is worse than no
 * report — it is confidently wrong.
 *
 * Origin, not registrable domain: `app.example.com` and `www.example.com` are
 * different products as often as they are the same one, and silently auditing a
 * marketing site the customer did not ask about is the exact failure above.
 * Widening scope should be an explicit choice, never a default.
 */
export function isInScope(candidate: string, targetOrigin: string): boolean {
  try {
    return new URL(candidate).origin === targetOrigin;
  } catch {
    return false;
  }
}

/** Non-throwing form, for hot paths like per-request interception. */
export async function isUrlAllowed(
  rawUrl: string,
  options: UrlGuardOptions = {},
): Promise<boolean> {
  try {
    await assertUrlAllowed(rawUrl, options);
    return true;
  } catch {
    return false;
  }
}

/**
 * Per-request interception decision for Playwright's `context.route`. A page we
 * point the browser at is attacker-controlled, so EVERY request it emits — not
 * just the top-level document — is a potential SSRF vector: a subresource
 * `fetch`/`img`/`script` to 169.254.169.254 or an RFC1918 host reaches the
 * internal network exactly as a navigation would.
 *
 * Two distinct checks with different scopes:
 *
 * - **SSRF (private/reserved address):** applies to every http(s) request. There
 *   is no legitimate reason for any subresource to hit a private destination.
 * - **Crawl scope (same-origin):** applies ONLY to top-level document
 *   navigations. Real pages legitimately load cross-origin CDN/font/analytics
 *   subresources; enforcing scope on those would break rendering of normal
 *   sites. Scope keeps the *agent* on the target site (see isInScope); it is not
 *   a security boundary.
 *
 * Non-network schemes (data:, blob:, about:) carry no SSRF surface and are always
 * allowed.
 */
export async function assertRequestAllowed(
  rawUrl: string,
  resourceType: string,
  options: UrlGuardOptions & { scopeOrigin?: string } = {},
): Promise<boolean> {
  let protocol: string;
  try {
    protocol = new URL(rawUrl).protocol;
  } catch {
    return false;
  }

  if (protocol !== "http:" && protocol !== "https:") return true;

  if (
    resourceType === "document" &&
    options.scopeOrigin &&
    !isInScope(rawUrl, options.scopeOrigin)
  ) {
    return false;
  }

  return isUrlAllowed(rawUrl, options);
}
