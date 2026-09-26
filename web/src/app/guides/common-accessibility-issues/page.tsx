import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { JsonLd, articleSchema } from "@/components/json-ld";
import { ContentArticle } from "@/components/dossier/content-article";

export const metadata: Metadata = {
  alternates: { canonical: "/guides/common-accessibility-issues" },
  title: "10 most common accessibility issues",
  description:
    "The accessibility issues found most often on real websites, each with its impact and fix.",
};

const issues = [
  {
    rank: 1,
    title: "Missing alt text on images",
    impact: "Screen readers announce \"image\" or read the filename. A user has no idea what the image shows.",
    fix: "Add descriptive alt text. For decorative images, use alt=\"\" to skip them.",
  },
  {
    rank: 2,
    title: "Low color contrast",
    impact: "Users with low vision, color blindness, or bright ambient light can't read the text.",
    fix: "Hold 4.5:1 contrast for normal text and 3:1 for large text. Check with a devtools contrast panel.",
  },
  {
    rank: 3,
    title: "Form inputs without labels",
    impact: "Screen readers say \"edit text\" with no context. A user doesn't know what to type.",
    fix: "Add a <label htmlFor> to every input. Placeholder text is not a label.",
  },
  {
    rank: 4,
    title: "Missing document language",
    impact: "Screen readers apply the wrong pronunciation rules, so French text gets read with English phonetics.",
    fix: "Add lang=\"en\" (or the right language) to the <html> element.",
  },
  {
    rank: 5,
    title: "No visible keyboard focus",
    impact: "A keyboard user can't tell which element is focused, and navigation becomes guesswork.",
    fix: "Never set outline: none with nothing in its place. Style :focus-visible instead.",
  },
  {
    rank: 6,
    title: "Broken heading hierarchy",
    impact: "Screen reader users navigate by headings. Skipping from h1 to h4 breaks that outline.",
    fix: "Use headings in order (h1, h2, h3) without skipping a level. One h1 per page.",
  },
  {
    rank: 7,
    title: "Links with no descriptive text",
    impact: "Screen readers can list every link on a page. \"Click here\" and \"Read more\" carry no meaning out of context.",
    fix: "Write link text that describes the destination: \"View pricing plans\", not \"Click here\".",
  },
  {
    rank: 8,
    title: "Missing skip navigation",
    impact: "A keyboard user must tab through the whole nav on every single page before reaching content.",
    fix: "Add a \"Skip to main content\" link as the first focusable element.",
  },
  {
    rank: 9,
    title: "Touch targets that are too small",
    impact: "Users with a motor impairment, or just larger fingers, miss the intended button on mobile.",
    fix: "Target at least 44×44 CSS pixels for interactive elements. WCAG 2.2 requires a 24×24 minimum.",
  },
  {
    rank: 10,
    title: "Auto-playing media",
    impact: "Unexpected audio disrupts a screen reader session, and unexpected motion can trigger a vestibular reaction.",
    fix: "Don't autoplay. If you must, give it a pause/stop control and respect prefers-reduced-motion.",
  },
] as const;

export default function CommonIssuesPage() {
  return (
    <MarketingShell narrow={false}>
      <JsonLd
        data={articleSchema({
          headline: "10 most common accessibility issues",
          description:
            "The accessibility issues found most often on real websites, each with its impact and fix.",
          path: "/guides/common-accessibility-issues",
          datePublished: "2026-05-04",
          dateModified: "2026-09-26",
        })}
      />
      <ContentArticle
        eyebrow="Field guide · reference"
        title="10 most common accessibility issues"
        dek={
          <>
            These mirror the failures found most often across the web. The{" "}
            <a
              href="https://webaim.org/projects/million/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              WebAIM Million
            </a>{" "}
            analysis of the top one million home pages finds a handful of failure types
            account for most detected errors. axe-core catches every one of these
            deterministically. The hard part is running it on the states behind your login.
          </>
        }
        lastReviewed="26 September 2026"
      >
        <h2 className="sr-only">Issues ranked by frequency</h2>
        <ol>
          {issues.map((issue) => (
            <li key={issue.rank}>
              <div className="flex items-baseline gap-3">
                <span className="label-mono shrink-0">{String(issue.rank).padStart(2, "0")}</span>
                <h3 className="!mt-0 !mb-0 inline">{issue.title}</h3>
              </div>
              <p className="mt-2">
                <strong>Impact.</strong> {issue.impact}
              </p>
              <p className="mt-1">
                <strong>Fix.</strong> {issue.fix}
              </p>
            </li>
          ))}
        </ol>

        <h2 className="sr-only">Find these automatically</h2>
        <p>
          Personaudit runs axe-core at every state it reaches, including authenticated pages a
          single-URL scan never sees. No signup required for the public-page grade.
        </p>

        <h2 className="sr-only">Related guides</h2>
        <ul>
          <li>
            <Link href="/guides/wcag-checklist" className="text-link">
              WCAG 2.2 AA checklist
            </Link>
          </li>
          <li>
            <Link href="/guides/screen-reader-testing" className="text-link">
              Screen reader testing guide
            </Link>
          </li>
          <li>
            <Link href="/guides/accessibility-deadlines" className="text-link">
              2025–2028 compliance deadlines
            </Link>
          </li>
        </ul>

        <Link
          href="/grade"
          className="inline-flex h-11 items-center justify-center rounded-sm bg-primary px-6 text-[0.9375rem] font-medium text-primary-foreground shadow-[inset_0_-2px_0_oklch(0_0_0/0.18)] transition-colors duration-150 hover:bg-[color-mix(in_oklch,var(--primary)_86%,black)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] no-underline"
        >
          Grade a site free
        </Link>
      </ContentArticle>
    </MarketingShell>
  );
}
