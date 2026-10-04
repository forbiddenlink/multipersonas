/** Hostname of a URL, or the input unchanged when it does not parse (older rows may hold a bare host). */
export function hostname(url: string): string {
  try {
    return new URL(url).hostname;
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
