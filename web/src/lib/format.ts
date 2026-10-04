/** Hostname of a URL, or the input unchanged when it does not parse (older rows may hold a bare host). */
export function hostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Path + query of a URL for lists where the host is already shown ("/pricing?plan=solo",
 * "/" for the root). A full URL in a narrow column truncates to "https://..." and hides the
 * only part that differs between rows. Returns the input unchanged when it does not parse.
 */
export function displayPath(url: string): string {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}`;
  } catch {
    return url;
  }
}

/** "Sep 3, 2026" in the viewer's locale. Returns "" for an unparseable timestamp. */
export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
