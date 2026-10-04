import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { ContentArticle } from "@/components/dossier/content-article";

export const metadata: Metadata = {
  alternates: { canonical: "/guides" },
  title: "Accessibility field guides",
  description:
    "Field guides on WCAG 2.2, accessibility deadlines, screen reader testing and gating CI on new axe-core defects.",
};

// Keep in step with the folders under app/guides: a test fails if a guide is missing here.
const GUIDES = [
  {
    slug: "wcag-checklist",
    title: "WCAG 2.2 AA checklist",
    blurb: "A practical checklist of the perceivable, operable, understandable and robust criteria, with examples.",
  },
  {
    slug: "common-accessibility-issues",
    title: "10 most common accessibility issues",
    blurb: "The issues found most often on real websites, each with its impact and fix.",
  },
  {
    slug: "accessibility-deadlines",
    title: "The 2025–2028 accessibility deadlines",
    blurb: "What the European Accessibility Act and ADA Title II require, and what to do this quarter.",
  },
  {
    slug: "screen-reader-testing",
    title: "Screen reader testing guide",
    blurb: "How to test with VoiceOver, NVDA and JAWS, and where automated tooling helps first.",
  },
  {
    slug: "ci-accessibility-gate",
    title: "CI accessibility gate",
    blurb: "Fail the build only on new axe-core defects. Baseline today's backlog, then gate pull requests.",
  },
] as const;

export default function GuidesIndexPage() {
  return (
    <MarketingShell narrow={false}>
      <ContentArticle
        eyebrow="Field guides"
        title="Field guides for accessibility work"
        mark="accessibility work"
        dek="Short, practical guides for people who ship and check websites. Pick the one that matches the job in front of you."
      >
        <ul className="list-none p-0!">
          {GUIDES.map((g) => (
            <li key={g.slug} className="border-b border-border py-5 first:border-t-2 first:border-t-foreground">
              <Link href={`/guides/${g.slug}`} className="font-medium">
                {g.title}
              </Link>
              <p className="mt-1.5 max-w-[58ch] text-muted-foreground">
                {g.blurb}
              </p>
            </li>
          ))}
        </ul>
      </ContentArticle>
    </MarketingShell>
  );
}
