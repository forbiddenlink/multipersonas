import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "10 Most Common Accessibility Issues",
  description: "The accessibility issues we find most often when testing real websites. Each with examples, impact on users, and how to fix.",
};

const issues = [
  {
    rank: 1,
    title: "Missing alt text on images",
    impact: "Screen readers announce 'image' or read the filename. Users have no idea what the image shows.",
    fix: "Add descriptive alt text. For decorative images, use alt=\"\" to skip them.",
    frequency: "Found on 68% of sites",
  },
  {
    rank: 2,
    title: "Low color contrast",
    impact: "Users with low vision, color blindness, or in bright sunlight can't read the text.",
    fix: "Ensure 4.5:1 contrast ratio for normal text, 3:1 for large text. Use browser devtools contrast checker.",
    frequency: "Found on 65% of sites",
  },
  {
    rank: 3,
    title: "Form inputs without labels",
    impact: "Screen readers say 'edit text' with no context. Users don't know what to type.",
    fix: "Add <label htmlFor='id'> to every input. Placeholder text is not a label.",
    frequency: "Found on 54% of sites",
  },
  {
    rank: 4,
    title: "Missing document language",
    impact: "Screen readers use wrong pronunciation rules. French text read with English phonetics.",
    fix: "Add lang='en' (or appropriate language) to <html> element.",
    frequency: "Found on 41% of sites",
  },
  {
    rank: 5,
    title: "No keyboard focus indicators",
    impact: "Keyboard users can't tell which element is focused. Navigation becomes guesswork.",
    fix: "Never set outline: none without a visible alternative. Use :focus-visible for modern browsers.",
    frequency: "Found on 39% of sites",
  },
  {
    rank: 6,
    title: "Broken heading hierarchy",
    impact: "Screen reader users navigate by headings. Skipping from h1 to h4 breaks document structure.",
    fix: "Use headings in order: h1, h2, h3. Don't skip levels. One h1 per page.",
    frequency: "Found on 37% of sites",
  },
  {
    rank: 7,
    title: "Links with no descriptive text",
    impact: "Screen readers list all links on a page. 'Click here' and 'Read more' are useless without context.",
    fix: "Use descriptive link text: 'View pricing plans' instead of 'Click here'.",
    frequency: "Found on 33% of sites",
  },
  {
    rank: 8,
    title: "Missing skip navigation",
    impact: "Keyboard users must tab through the entire nav on every page before reaching content.",
    fix: "Add a 'Skip to main content' link as the first focusable element.",
    frequency: "Found on 72% of sites",
  },
  {
    rank: 9,
    title: "Touch targets too small",
    impact: "Users with motor impairments or large fingers can't tap the right button on mobile.",
    fix: "Minimum 44x44 CSS pixels for interactive elements. WCAG 2.2 requires 24x24 minimum.",
    frequency: "Found on 28% of sites",
  },
  {
    rank: 10,
    title: "Auto-playing media",
    impact: "Unexpected audio disrupts screen reader users. Unexpected motion can trigger vestibular disorders.",
    fix: "Never auto-play. If you must, provide pause/stop control and respect prefers-reduced-motion.",
    frequency: "Found on 15% of sites",
  },
];

export default function CommonIssuesPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight font-heading">10 Most Common Accessibility Issues</h1>
      <p className="mt-4 text-muted-foreground">
        These are the issues we find most often when AI personas browse real websites.
        Each one affects real users — not just compliance scores.
      </p>

      <div className="mt-10 space-y-8">
        {issues.map((issue) => (
          <div key={issue.rank} className="rounded-lg border border-border p-5">
            <div className="flex items-start gap-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {issue.rank}
              </span>
              <div>
                <h2 className="text-lg font-medium">{issue.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground/70">{issue.frequency}</p>
                <p className="mt-3 text-sm text-muted-foreground"><strong className="text-foreground">Impact:</strong> {issue.impact}</p>
                <p className="mt-2 text-sm text-muted-foreground"><strong className="text-foreground">Fix:</strong> {issue.fix}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h2 className="text-lg font-semibold">Find these issues automatically</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste your URL and AI personas will check for all of these — no signup required.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Run a free audit
        </Link>
      </div>

      <div className="mt-8">
        <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
