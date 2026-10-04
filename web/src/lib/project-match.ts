/** The site a URL belongs to, for matching a run to a project: lowercase host without a
 * leading "www.". Subdomains stay distinct (app.acme.test is not acme.test). Null when the
 * text is not a parseable URL. */
export function siteHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/** The project whose site matches `url`, if any. First match wins. */
export function findProjectForUrl<P extends { url: string }>(projects: readonly P[], url: string): P | undefined {
  const host = siteHost(url);
  if (!host) return undefined;
  return projects.find((p) => siteHost(p.url) === host);
}
