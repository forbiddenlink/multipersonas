import { CHANGELOG } from "@/lib/changelog";
import { buildChangelogFeed } from "@/lib/changelog-feed";
import { siteOrigin } from "@/lib/site-url";

export const dynamic = "force-static";

export function GET(): Response {
  return new Response(buildChangelogFeed(CHANGELOG, siteOrigin()), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
