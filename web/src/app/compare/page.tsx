import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { ContentArticle } from "@/components/dossier/content-article";

export const metadata: Metadata = {
  alternates: { canonical: "/compare" },
  title: "Compare Personaudit with other accessibility CI tools",
  description:
    "Fact-checked comparisons of Personaudit with GitHub's accessibility scanner and pa11y-ci: what each does well, where they differ, and which to pick.",
};

const COMPARISONS = [
  {
    slug: "github-accessibility-scanner",
    title: "Personaudit vs GitHub accessibility scanner",
    blurb: "The scanner files GitHub Issues and can hand them to Copilot. Personaudit gates pull requests on new defects only.",
  },
  {
    slug: "pa11y-ci",
    title: "Personaudit vs pa11y-ci",
    blurb: "pa11y-ci reads a config file or a sitemap and applies per-page thresholds. Personaudit compares against a baseline of known defects.",
  },
] as const;

export default function CompareIndexPage() {
  return (
    <MarketingShell narrow={false}>
      <ContentArticle
        eyebrow="Compare"
        title="Personaudit compared with other tools"
        mark="compared"
        dek="Each page checks its claims against the other tool's own README and says where that tool is the better pick."
      >
        <ul className="list-none p-0!">
          {COMPARISONS.map((c) => (
            <li key={c.slug} className="border-b border-border py-5 first:border-t-2 first:border-t-foreground">
              <Link href={`/compare/${c.slug}`} className="font-medium">
                {c.title}
              </Link>
              <p className="mt-1.5 max-w-[58ch] text-muted-foreground">{c.blurb}</p>
            </li>
          ))}
        </ul>
      </ContentArticle>
    </MarketingShell>
  );
}
