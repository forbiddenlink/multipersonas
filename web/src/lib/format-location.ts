// A finding's location can be a single URL or a comma-joined list of the states it was
// seen in (axe seenOn). When a persona clicks a broken link, the browser lands on an
// internal error page (chrome-error://, about:blank, chrome://) and axe scans it there —
// truthful, but those scheme URLs are noise to a user. Relabel them as "(error page)"
// and dedupe. Returns null when there's nothing meaningful to show.
export function formatLocation(location: string | null | undefined): string | null {
  if (!location) return null;
  const cleaned = location
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) =>
      /^(chrome-error:|about:blank|chrome:|data:)/i.test(part) ? "(error page)" : part,
    );
  const deduped = [...new Set(cleaned)];
  return deduped.length ? deduped.join(", ") : null;
}
