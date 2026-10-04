/**
 * Normalize what someone types into the grade form. A bare host like `example.com`
 * gets `https://` prefixed; anything with an explicit scheme is left for the caller to
 * validate (so `ftp://x` is still rejected as "not http/https" rather than silently
 * rewritten). Returns the trimmed input untouched when it is empty.
 */
export function normalizeGradeInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  // `scheme:` followed by `//`, or a bare `mailto:`/`javascript:`-style scheme. A host:port
  // such as `localhost:3000` also matches `scheme:` so require the `//` or a letter-only
  // scheme followed by a non-digit to avoid treating the port as a scheme.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  if (/^(mailto|javascript|data|file|tel|about|blob):/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * A prefilled `?url=` value from a "Re-grade this site" link. Only an http(s) URL of a
 * sane length is accepted; the visitor still has to submit it themselves.
 */
export function prefillFromSearch(search: string): string | null {
  const value = new URLSearchParams(search).get("url");
  if (!value || value.length > 2048) return null;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}
