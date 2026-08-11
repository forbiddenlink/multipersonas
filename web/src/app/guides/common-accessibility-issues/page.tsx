import type { Metadata } from "next";
import Link from "next/link";
import { BoxDivider } from "@/components/forensic/divider";
import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = {
  alternates: { canonical: "/guides/common-accessibility-issues" },
  title: "10 Most Common Accessibility Issues",
  description: "The accessibility issues found most often on real websites. Each with examples, impact on users, and how to fix.",
};

const issues = [
  {
    rank: 1,
    title: "Missing alt text on images",
    impact: "Screen readers announce 'image' or read the filename. Users have no idea what the image shows.",
    fix: "Add descriptive alt text. For decorative images, use alt=\"\" to skip them.",
  },
  {
    rank: 2,
    title: "Low color contrast",
    impact: "Users with low vision, color blindness, or in bright sunlight can't read the text.",
    fix: "Ensure 4.5:1 contrast ratio for normal text, 3:1 for large text. Use browser devtools contrast checker.",
  },
  {
    rank: 3,
    title: "Form inputs without labels",
    impact: "Screen readers say 'edit text' with no context. Users don't know what to type.",
    fix: "Add <label htmlFor='id'> to every input. Placeholder text is not a label.",
  },
  {
    rank: 4,
    title: "Missing document language",
    impact: "Screen readers use wrong pronunciation rules. French text read with English phonetics.",
    fix: "Add lang='en' (or appropriate language) to <html> element.",
  },
  {
    rank: 5,
    title: "No keyboard focus indicators",
    impact: "Keyboard users can't tell which element is focused. Navigation becomes guesswork.",
    fix: "Never set outline: none without a visible alternative. Use :focus-visible for modern browsers.",
  },
  {
    rank: 6,
    title: "Broken heading hierarchy",
    impact: "Screen reader users navigate by headings. Skipping from h1 to h4 breaks document structure.",
    fix: "Use headings in order: h1, h2, h3. Don't skip levels. One h1 per page.",
  },
  {
    rank: 7,
    title: "Links with no descriptive text",
    impact: "Screen readers list all links on a page. 'Click here' and 'Read more' are useless without context.",
    fix: "Use descriptive link text: 'View pricing plans' instead of 'Click here'.",
  },
  {
    rank: 8,
    title: "Missing skip navigation",
    impact: "Keyboard users must tab through the entire nav on every page before reaching content.",
    fix: "Add a 'Skip to main content' link as the first focusable element.",
  },
  {
    rank: 9,
    title: "Touch targets too small",
    impact: "Users with motor impairments or large fingers can't tap the right button on mobile.",
    fix: "Minimum 44x44 CSS pixels for interactive elements. WCAG 2.2 requires 24x24 minimum.",
  },
  {
    rank: 10,
    title: "Auto-playing media",
    impact: "Unexpected audio disrupts screen reader users. Unexpected motion can trigger vestibular disorders.",
    fix: "Never auto-play. If you must, provide pause/stop control and respect prefers-reduced-motion.",
  },
];

export default function CommonIssuesPage() {
  return (
    <MarketingShell>
      <p className="font-mono text-xs text-muted-foreground">
        <span className="rounded-sm border border-border px-2.5 py-1">reference · top 10</span>
      </p>
      <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">10 Most Common Accessibility Issues</h1>
      <p className="mt-4 font-serif text-lg leading-relaxed text-muted-foreground">
        These mirror the failures found most often across the web. The{" "}
        <a
          href="https://webaim.org/projects/million/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        >
          WebAIM Million
        </a>{" "}
        analysis of the top one million home pages finds a handful of failure types account for
        the large majority of all detected errors. axe-core catches every one of these
        deterministically — the hard part is running it on the states behind your login.
      </p>

      <h2 className="sr-only">Issues ranked by frequency</h2>
      <BoxDivider label="ranked by frequency" className="mt-10" />

      <ol className="mt-10 divide-y divide-border border-y border-border">
        {issues.map((issue) => (
          <li key={issue.rank} className="flex items-start gap-4 py-5">
            <span className="flex size-8 shrink-0 items-center justify-center font-mono text-sm font-bold tabular-nums text-muted-foreground">
              {issue.rank}
            </span>
            <div>
              <h3 className="text-lg font-medium tracking-tight">{issue.title}</h3>
              <p className="mt-3 font-serif text-sm leading-relaxed text-muted-foreground"><strong className="font-medium text-foreground">Impact:</strong> {issue.impact}</p>
              <p className="mt-2 font-serif text-sm leading-relaxed text-muted-foreground"><strong className="font-medium text-foreground">Fix:</strong> {issue.fix}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 border-t border-border pt-8">
        <h2 className="text-lg font-semibold tracking-tight">Find these automatically — even behind a login</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Personaudit runs axe-core at every state it reaches, including authenticated pages a
          single-URL scan never sees. No signup required.
        </p>
        <Link
          href="/#scan"
          className="mt-4 inline-block rounded-sm bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        >
          Run a free audit
        </Link>
      </div>
    </MarketingShell>
  );
}
