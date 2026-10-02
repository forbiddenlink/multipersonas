import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { JsonLd, articleSchema } from "@/components/json-ld";
import { ContentArticle } from "@/components/dossier/content-article";
import { ContentCallout } from "@/components/dossier/content-callout";

export const metadata: Metadata = {
  alternates: { canonical: "/guides/accessibility-deadlines" },
  title: "The 2025–2028 accessibility deadlines",
  description:
    "The European Accessibility Act is already enforceable. ADA Title II now has two phased deadlines, April 2027 and April 2028. What each rule covers, the standard both point to, and what to do this quarter.",
};

export default function AccessibilityDeadlinesGuidePage() {
  return (
    <MarketingShell narrow={false}>
      <JsonLd
        data={articleSchema({
          headline: "The 2025–2028 accessibility deadlines",
          description:
            "The European Accessibility Act is already enforceable. ADA Title II now has two phased deadlines, April 2027 and April 2028. What each rule covers, the standard both point to, and what to do this quarter.",
          path: "/guides/accessibility-deadlines",
          datePublished: "2026-09-26",
          dateModified: "2026-09-26",
        })}
      />
      <ContentArticle
        tryIt
        eyebrow="Field guide · compliance deadlines"
        title="The 2025–2028 accessibility deadlines"
        mark="deadlines"
        dek="One deadline has already passed. Two more are on the calendar for U.S. state and local government sites. None of them are optional, and none of them wait for a scan to be convenient."
        lastReviewed="26 September 2026"
        toc={[
          { id: "eaa", label: "European Accessibility Act" },
          { id: "ada-title-ii", label: "ADA Title II" },
          { id: "standard", label: "The standard" },
          { id: "what-to-do-now", label: "What to do this quarter" },
          { id: "sources", label: "Sources" },
        ]}
      >
        <h2 id="eaa">European Accessibility Act: already enforceable</h2>
        <p>
          The European Accessibility Act (Directive (EU) 2019/882) became enforceable on{" "}
          <strong>June 28, 2025</strong>. It reaches private-sector products and services sold
          in the EU, including e-commerce, banking, e-books, and passenger transport. That is a
          much wider net than public-sector rules, and one most U.S.-based teams selling into
          Europe underestimate.
        </p>
        <p>
          There is no phase-in left to plan around: if a covered product or service shipped
          after that date, the obligation is already live.
        </p>

        <h2 id="ada-title-ii">ADA Title II: two dates, not one</h2>
        <p>
          The Department of Justice finalized its ADA Title II web and mobile app rule on{" "}
          April 24, 2024, covering state and local government entities in the United States.
          An interim final rule published{" "}
          <a
            href="https://www.federalregister.gov/documents/2026/04/20/2026-07663/extension-of-compliance-dates-for-nondiscrimination-on-the-basis-of-disability-accessibility-of-web"
            className="text-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            April 20, 2026
          </a>{" "}
          pushed the original single deadline back and split it in two:
        </p>
        <ul>
          <li>
            <strong>April 26, 2027</strong>: state and local government entities serving a
            population of 50,000 or more.
          </li>
          <li>
            <strong>April 26, 2028</strong>: smaller entities and all special district
            governments, regardless of population.
          </li>
        </ul>
        <p>
          The technical requirement did not change, only the timeline. A 2027 deadline is nearer
          than it sounds once you count the months an audit-and-fix cycle actually takes on a
          real government site with an authenticated citizen portal behind it.
        </p>

        <h2 id="standard">The standard both point to</h2>
        <p>
          Both regimes measure conformance against <strong>WCAG 2.1 Level AA</strong>. Neither
          rule requires a specific tool or vendor. They require the outcome axe-core checks for
          deterministically: alt text, labeled forms, keyboard operability, contrast, and the
          rest of the 2.1 AA success criteria.
        </p>

        <h2 id="what-to-do-now">What to do this quarter</h2>
        <ol>
          <li>
            <strong>Run a baseline scan now, not near the deadline.</strong> Crawl the site,
            including any state that only exists after a citizen signs in, and see the actual
            defect count before committing to a fix timeline.
          </li>
          <li>
            <strong>Fix critical and serious findings first.</strong> A missing accessible
            name on a form control blocks a task outright; a nice-to-have contrast tweak
            doesn&apos;t. Triage by what a screen reader user actually hits.
          </li>
          <li>
            <strong>Gate new work in CI.</strong> A baseline plus a{" "}
            <Link href="/guides/ci-accessibility-gate" className="text-link">
              CI accessibility gate
            </Link>{" "}
            stops the backlog from growing while it&apos;s being cleared.
          </li>
          <li>
            <strong>Don&apos;t reach for an overlay.</strong> A widget that adjusts contrast or
            font size on top of the existing markup doesn&apos;t fix the underlying barrier,
            and it is not accepted as compliance evidence by either regime.
          </li>
          <li>
            <strong>Keep a dated record of progress.</strong> A retest comparison between two
            scans (new, cleared, still-open) is the evidence an agency or a client will ask
            for later.
          </li>
        </ol>

        <ContentCallout label="Not legal advice">
          This guide describes public regulatory text as of the date above. It is not legal
          advice, and it does not cover every jurisdiction or sector-specific rule that may
          also apply to a given site. Confirm current requirements and their exact scope for
          your entity with counsel.
        </ContentCallout>

        <h2 id="sources">Sources</h2>
        <ul>
          <li>
            <a
              href="https://www.federalregister.gov/documents/2026/04/20/2026-07663/extension-of-compliance-dates-for-nondiscrimination-on-the-basis-of-disability-accessibility-of-web"
              className="text-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Federal Register 2026-07663
            </a>
            : DOJ interim final rule extending ADA Title II web/app compliance dates (published
            April 20, 2026).
          </li>
          <li>
            <a
              href="https://www.ada.gov/title-ii-web-rule/"
              className="text-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              ADA.gov: Title II web and mobile app rule
            </a>
            : the department&apos;s own summary of the original rule and the 2026 extension.
          </li>
          <li>
            <a
              href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32019L0882"
              className="text-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Directive (EU) 2019/882
            </a>
            : the European Accessibility Act, in force since June 28, 2025.
          </li>
        </ul>

        <h2 className="sr-only">Related guides</h2>
        <ul>
          <li>
            <Link href="/guides/ci-accessibility-gate" className="text-link">
              CI accessibility gate
            </Link>
          </li>
          <li>
            <Link href="/guides/wcag-checklist" className="text-link">
              WCAG 2.2 AA checklist
            </Link>
          </li>
        </ul>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/grade"
            className="inline-flex h-11 items-center justify-center rounded-sm bg-primary px-6 text-[0.9375rem] font-medium text-primary-foreground shadow-[inset_0_-2px_0_oklch(0_0_0/0.18)] transition-colors duration-150 hover:bg-[color-mix(in_oklch,var(--primary)_86%,black)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] no-underline"
          >
            Grade a site free
          </Link>
          <Link
            href="/docs"
            className="inline-flex h-11 items-center justify-center rounded-sm border border-border px-6 text-[0.9375rem] font-medium text-muted-foreground transition-colors duration-150 hover:border-foreground/25 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] no-underline"
          >
            Read the CLI docs
          </Link>
        </div>
      </ContentArticle>
    </MarketingShell>
  );
}
