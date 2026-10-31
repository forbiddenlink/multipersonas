import { describe, expect, it } from "vitest";
import { CHANGELOG, CHANGELOG_PR_BASE, changelogIds } from "@/lib/changelog";
import { buildChangelogFeed, rfc822 } from "@/lib/changelog-feed";

const ORIGIN = "https://example.test";

describe("rfc822", () => {
  it("formats an ISO date as midnight GMT with the right weekday", () => {
    expect(rfc822("2026-10-28")).toBe("Wed, 28 Oct 2026 00:00:00 GMT");
  });
});

describe("buildChangelogFeed", () => {
  it("emits one item per entry, in order, linked to the page anchor the changelog page uses", () => {
    const xml = buildChangelogFeed(CHANGELOG, ORIGIN);
    const ids = changelogIds(CHANGELOG);
    const links = [...xml.matchAll(/<item>[\s\S]*?<link>(.*?)<\/link>/g)].map((m) => m[1]);
    expect(links).toEqual(ids.map((id) => `${ORIGIN}/changelog#${id}`));
  });

  it("carries each entry's full text, date and pull request link", () => {
    const xml = buildChangelogFeed(CHANGELOG.slice(0, 1), ORIGIN);
    const first = CHANGELOG[0]!;
    expect(xml).toContain(`<pubDate>${rfc822(first.date)}</pubDate>`);
    expect(xml).toContain(`${CHANGELOG_PR_BASE}/${first.pr}`);
    expect(xml).toContain("personaudit mcp runs a local MCP server");
  });

  it("escapes XML special characters in entry text", () => {
    const xml = buildChangelogFeed([{ date: "2026-10-28", text: 'A <b> & "c"', pr: 1 }], ORIGIN);
    expect(xml).toContain("A &lt;b&gt; &amp; &quot;c&quot;");
    expect(xml).not.toContain("<b>");
  });

  it("sets lastBuildDate from the newest entry, not from the clock", () => {
    const xml = buildChangelogFeed(CHANGELOG, ORIGIN);
    expect(xml).toContain(`<lastBuildDate>${rfc822(CHANGELOG[0]!.date)}</lastBuildDate>`);
  });

  it("points the feed's own atom:link at feed.xml", () => {
    expect(buildChangelogFeed(CHANGELOG, ORIGIN)).toContain(
      `<atom:link href="${ORIGIN}/changelog/feed.xml" rel="self" type="application/rss+xml" />`,
    );
  });
});
