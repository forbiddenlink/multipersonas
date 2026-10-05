/** Public origin for absolute links (metadata, sitemap, Stripe return URLs, emails). */
export function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://personaudit.com";
}
