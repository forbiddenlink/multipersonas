/**
 * Same-origin path guard for post-auth redirects (?next= / ?returnTo=).
 * Rejects protocol-relative URLs, backslash tricks, absolute URLs, and control
 * characters so login/signup/OAuth can't be turned into an open redirect.
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
  // Tabs/newlines/%00-style controls can confuse some redirect clients.
  if (/[\u0000-\u001F\u007F]/.test(raw)) return fallback;
  return raw;
}
