/**
 * Same-origin path guard for post-auth redirects (?next= / ?returnTo=).
 * Rejects protocol-relative URLs, backslash tricks, and absolute URLs so login/
 * signup/OAuth can't be turned into an open redirect.
 */
export function safeRedirectPath(
  raw: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  // After URLSearchParams decoding, /\evil or /%5C… still contain a backslash.
  if (raw.includes("\\")) return fallback;
  if (raw.includes("://")) return fallback;
  return raw;
}
