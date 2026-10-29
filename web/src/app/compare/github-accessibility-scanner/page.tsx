import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { ContentArticle } from "@/components/dossier/content-article";
import { CompareTable, type CompareRow } from "@/components/dossier/compare-table";

export const metadata: Metadata = {
  alternates: { canonical: "/compare/github-accessibility-scanner" },
  title: "Personaudit vs GitHub accessibility scanner",
  description:
    "GitHub's accessibility scanner files issues and can assign them to Copilot. Personaudit gates pull requests on new axe-core defects. A fact-checked comparison, including where GitHub's tool is better.",
};

const ROWS: readonly CompareRow[] = [
  {
    topic: "License",
    them: "MIT",
    us: "MIT",
  },
  {
    topic: "What a finding becomes",
    them: "A GitHub Issue. Grouping is set by group_by: finding (default), rule, or rule+url.",
    us: "A row in the Markdown report and in scan.json. Personaudit does not file issues.",
  },
  {
    topic: "Fixing",
    them: "Issues can be assigned to GitHub Copilot. Copilot is optional.",
    us: "No fix automation. The report lists each element and the axe rule it failed.",
  },
  {
    topic: "Engines",
    them: "axe and accesslint built in, plus plugins.",
    us: "axe-core only, with no model calls.",
  },
  {
    topic: "What fails the build",
    them: "The README describes filing, closing and reopening issues. It does not describe a pass or fail gate.",
    us: "Only defects missing from a committed baseline, at or above a severity you set with fail-on.",
  },
  {
    topic: "Telling the same defect apart across runs",
    them: "Not described in the README.",
    us: "A defect key built from the axe rule and a selector with framework-generated ids collapsed.",
  },
  {
    topic: "Accepting a known defect",
    them: "Close the issue and add the wontfix label.",
    us: "A suppressions file where each entry has a reason, an owner and an expiry date. An expired entry on a still-present defect fails the gate.",
  },
  {
    topic: "Pull request feedback",
    them: "The README describes issues, not a pull request comment.",
    us: "One sticky pull request comment with new, fixed and still-open counts, when comment is true.",
  },
  {
    topic: "Which URLs get scanned",
    them: "A urls list or a url_configs array with per-URL excludeSelectors and waitForSelectors.",
    us: "A crawl from one start URL, capped by max-pages. There is no per-URL config file.",
  },
  {
    topic: "Signed-in pages",
    them: "login_url, username and password inputs, or auth_context for complex flows.",
    us: "A session you save yourself in a local browser with the CLI. The hosted service scans public pages only.",
  },
  {
    topic: "Credentials needed",
    them: "A fine-grained personal access token stored as a repository secret. The default workflow token cannot be used.",
    us: "No API key. The CLI and the GitHub Action run keyless.",
  },
  {
    topic: "Trial run",
    them: "dry_run logs the issues it would file without opening any.",
    us: "Run the CLI locally and read the report. Nothing is filed anywhere.",
  },
];

export default function CompareGithubScannerPage() {
  return (
    <MarketingShell narrow={false}>
      <ContentArticle
        eyebrow="Compare"
        title="Personaudit vs GitHub accessibility scanner"
        mark="GitHub accessibility scanner"
        dek="Both run axe-core in CI. They answer different questions: what is wrong on this site, and did this pull request make it worse."
        lastReviewed="28 October 2026"
        toc={[
          { id: "summary", label: "The short version" },
          { id: "table", label: "Side by side" },
          { id: "github-better", label: "Where GitHub's tool is better" },
          { id: "personaudit-better", label: "Where Personaudit fits" },
          { id: "sources", label: "Sources" },
        ]}
      >
        <p>
          <strong>As of 2026-10-28.</strong> Claims about GitHub&apos;s tool come from its README
          on that date. Check the README before you rely on a row, because both tools change.
        </p>

        <h2 id="summary">The short version</h2>
        <p>
          GitHub&apos;s accessibility scanner is a good tool. It turns every finding into a
          trackable GitHub Issue, can hand those issues to Copilot, and runs more than one engine.
          If your team already works from issues, that workflow is hard to beat.
        </p>
        <p>
          Personaudit does not file issues. It compares each run with a baseline and fails the
          build only on defects that are new, so a pull request is judged on what it changed. The
          two can run side by side.
        </p>

        <h2 id="table">Side by side</h2>
        <CompareTable
          caption="Personaudit and GitHub accessibility scanner compared row by row"
          themLabel="GitHub accessibility scanner"
          rows={ROWS}
        />

        <h2 id="github-better">Where GitHub&apos;s tool is better</h2>
        <ul>
          <li>
            It files an issue per finding, so work is assigned, discussed and closed where the
            team already tracks it. Personaudit leaves a report.
          </li>
          <li>It can assign issues to Copilot for a proposed fix. Personaudit proposes nothing.</li>
          <li>
            It supports a second built-in engine, accesslint, and plugins. Personaudit runs
            axe-core only.
          </li>
          <li>
            It takes per-URL settings, including selectors to exclude and elements to wait for.
            Personaudit crawls from one start URL.
          </li>
          <li>
            It can log in with a username and password input. Personaudit needs you to save a
            session first.
          </li>
        </ul>

        <h2 id="personaudit-better">Where Personaudit fits</h2>
        <ul>
          <li>
            You inherit a site with hundreds of existing defects and want CI to block only new
            ones. Commit a baseline once, then fail on anything not in it.
          </li>
          <li>
            You need an accepted defect to come back for review. A suppression expires, and an
            expired suppression on a defect that is still there fails the gate.
          </li>
          <li>
            You cannot create a personal access token for a pipeline. The action needs no key.
          </li>
          <li>
            You want pull request feedback as one comment that updates in place, with counts of
            new, fixed and still-open defects.
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
              href="https://github.com/github/accessibility-scanner"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              github/accessibility-scanner README
            </a>
            , read 2026-10-28. The latest release shown on the repository is v3.5.1, published
            2026-10-16.
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
