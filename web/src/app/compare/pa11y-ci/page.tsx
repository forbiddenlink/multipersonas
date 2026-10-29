import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { ContentArticle } from "@/components/dossier/content-article";
import { CompareTable, type CompareRow } from "@/components/dossier/compare-table";

export const metadata: Metadata = {
  alternates: { canonical: "/compare/pa11y-ci" },
  title: "Personaudit vs pa11y-ci",
  description:
    "pa11y-ci tests a list of URLs or a sitemap against per-page thresholds. Personaudit crawls and fails only on new axe-core defects. A fact-checked comparison, including where pa11y-ci is better.",
};

const ROWS: readonly CompareRow[] = [
  {
    topic: "License",
    them: "LGPL-3.0-only",
    us: "MIT",
  },
  {
    topic: "Configuration",
    them: "A config file, or one you point to with --config (JSON or JavaScript).",
    us: "CLI flags and GitHub Action inputs. There is no config file for the URL list.",
  },
  {
    topic: "Which URLs get tested",
    them: "The URLs you list, or every URL in a sitemap passed with --sitemap. --sitemap-exclude filters by regular expression.",
    us: "A crawl from one start URL, capped by max-pages. Personaudit does not read a sitemap.",
  },
  {
    topic: "Runners",
    them: "htmlcs (HTML_CodeSniffer, the default), axe, or both.",
    us: "axe-core only.",
  },
  {
    topic: "What fails the build",
    them: "A page fails when its issue count is above its threshold. Thresholds can be set in defaults or per URL.",
    us: "Defects not in a committed baseline, at or above the severity you set with fail-on.",
  },
  {
    topic: "Telling the same defect apart across runs",
    them: "The README describes issue counts per page, not defect identity.",
    us: "A defect key built from the axe rule and a selector with framework-generated ids collapsed.",
  },
  {
    topic: "Accepting a known defect",
    them: "Raise the page's threshold.",
    us: "A suppressions file where each entry has a reason, an owner and an expiry date. An expired entry on a still-present defect fails the gate.",
  },
  {
    topic: "Machine-readable output",
    them: "A JSON reporter, to the console or to a file you name.",
    us: "scan.json next to a Markdown report.",
  },
  {
    topic: "Pull request feedback",
    them: "Not described in the README.",
    us: "One sticky pull request comment with new, fixed and still-open counts, when comment is true.",
  },
];

export default function ComparePa11yCiPage() {
  return (
    <MarketingShell narrow={false}>
      <ContentArticle
        eyebrow="Compare"
        title="Personaudit vs pa11y-ci"
        mark="pa11y-ci"
        dek="pa11y-ci tests the pages you name against a limit. Personaudit remembers the defects you already have and fails on new ones."
        lastReviewed="28 October 2026"
        toc={[
          { id: "summary", label: "The short version" },
          { id: "table", label: "Side by side" },
          { id: "pa11y-better", label: "Where pa11y-ci is better" },
          { id: "personaudit-better", label: "Where Personaudit fits" },
          { id: "sources", label: "Sources" },
        ]}
      >
        <p>
          <strong>As of 2026-10-28.</strong> Claims about pa11y-ci come from its README on that
          date. Check the README before you rely on a row, because both tools change.
        </p>

        <h2 id="summary">The short version</h2>
        <p>
          pa11y-ci is a mature command line runner. You describe the pages in a config file or
          point it at a sitemap, set a threshold, and it fails when a page goes over. It is a good
          fit when you know exactly which URLs matter.
        </p>
        <p>
          Personaudit finds pages by crawling and judges a run against a baseline. A page that
          already has ten known defects can keep them, and the build fails when an eleventh
          appears.
        </p>

        <h2 id="table">Side by side</h2>
        <CompareTable
          caption="Personaudit and pa11y-ci compared row by row"
          themLabel="pa11y-ci"
          rows={ROWS}
        />

        <h2 id="pa11y-better">Where pa11y-ci is better</h2>
        <ul>
          <li>
            It reads a sitemap, so a large site is covered without listing URLs by hand.
            Personaudit does not ingest a sitemap.
          </li>
          <li>
            A config file keeps the URL list, defaults and per-URL options in version control.
            Personaudit has no equivalent file.
          </li>
          <li>
            Thresholds are set per URL, so a page you know is rough can have its own limit.
          </li>
          <li>
            It offers HTML_CodeSniffer as a runner, alone or alongside axe. Personaudit runs axe-core
            only.
          </li>
        </ul>

        <h2 id="personaudit-better">Where Personaudit fits</h2>
        <ul>
          <li>
            A count threshold lets one old defect be swapped for a new one without failing.
            A baseline keyed by defect catches the swap.
          </li>
          <li>
            You want accepted defects to expire. A suppression carries a reason, an owner and a
            date, and fails the gate once the date passes.
          </li>
          <li>
            You want the pull request to carry the result as one comment that updates in place.
          </li>
          <li>
            The pages you care about sit behind a login. Pa11y can script login steps with its
            actions option; with the Personaudit CLI you save a session once and the crawl reuses it.
          </li>
        </ul>
        <p>
          Automated checks, from either tool, catch only part of what WCAG covers. A clean run
          does not mean the site works for everyone. See{" "}
          <Link href="/method" className="text-link">
            how Personaudit tests
          </Link>{" "}
          and the{" "}
          <Link href="/guides/ci-accessibility-gate" className="text-link">
            CI gate guide
          </Link>
          .
        </p>

        <h2 id="sources">Sources</h2>
        <ul>
          <li>
            <a
              href="https://github.com/pa11y/pa11y-ci"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              pa11y/pa11y-ci README
            </a>
            , read 2026-10-28.
          </li>
          <li>
            Personaudit facts come from this project&apos;s own source: the action inputs in{" "}
            <code>action.yml</code>, the defect key in <code>src/agent/defect-key.ts</code>, and
            the suppression rules in <code>src/crawler/suppressions.ts</code>.
          </li>
        </ul>
      </ContentArticle>
    </MarketingShell>
  );
}
