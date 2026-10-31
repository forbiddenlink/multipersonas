import { CHANGELOG_PR_BASE, changelogIds, type ChangelogEntry } from "@/lib/changelog";
import { shortenUpdate } from "@/lib/latest-update";

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => XML_ESCAPES[c] ?? c);
}

/** "2026-10-28" -> "Wed, 28 Oct 2026 00:00:00 GMT". Entries record a merge date only, so the time is midnight UTC. */
export function rfc822(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).toUTCString();
}

/**
 * RSS 2.0 for the changelog page. Reads the same CHANGELOG array the page renders and uses the same
 * `pr-<number>` anchors, so each item links to its entry on /changelog. `lastBuildDate` is the newest
 * entry's date, so the output depends only on the data.
 */
export function buildChangelogFeed(entries: ChangelogEntry[], origin: string): string {
  const ids = changelogIds(entries);
  const items = entries
    .map((e, i) => {
      const link = `${origin}/changelog#${ids[i]}`;
      return [
        "    <item>",
        `      <title>${esc(shortenUpdate(e.text))}</title>`,
        `      <link>${esc(link)}</link>`,
        `      <guid isPermaLink="true">${esc(link)}</guid>`,
        `      <pubDate>${rfc822(e.date)}</pubDate>`,
        `      <description>${esc(`${e.text} Pull request: ${CHANGELOG_PR_BASE}/${e.pr}`)}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");
  const newest = entries[0];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    "    <title>Personaudit changelog</title>",
    `    <link>${esc(`${origin}/changelog`)}</link>`,
    "    <description>User-visible changes to Personaudit, taken from merged pull requests.</description>",
    "    <language>en</language>",
    ...(newest ? [`    <lastBuildDate>${rfc822(newest.date)}</lastBuildDate>`] : []),
    `    <atom:link href="${esc(`${origin}/changelog/feed.xml`)}" rel="self" type="application/rss+xml" />`,
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
