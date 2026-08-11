import type { Metadata } from "next";
import Link from "next/link";
import { WcagCitation } from "@/components/forensic/wcag-citation";
import { BoxDivider } from "@/components/forensic/divider";
import { MarketingShell } from "@/components/marketing-shell";
import { JsonLd, articleSchema } from "@/components/json-ld";

export const metadata: Metadata = {
  alternates: { canonical: "/guides/wcag-checklist" },
  title: "WCAG 2.2 AA Checklist",
  description: "A practical checklist for WCAG 2.2 AA compliance. Covers perceivable, operable, understandable, and robust criteria with examples.",
};

const checks = [
  {
    category: "Perceivable",
    items: [
      { rule: "Images have alt text", wcag: "1.1.1", how: "Add alt attribute to all <img> tags. Decorative images use alt=\"\"." },
      { rule: "Video has captions", wcag: "1.2.2", how: "Add closed captions to all pre-recorded video content." },
      { rule: "Color is not the only indicator", wcag: "1.4.1", how: "Use icons, text labels, or patterns alongside color." },
      { rule: "Text contrast is 4.5:1 minimum", wcag: "1.4.3", how: "Check with browser devtools or contrast checker." },
      { rule: "Text resizes to 200% without loss", wcag: "1.4.4", how: "Use relative units (rem, em) not fixed px for text." },
    ],
  },
  {
    category: "Operable",
    items: [
      { rule: "All functionality via keyboard", wcag: "2.1.1", how: "Tab through entire page. Every control must be reachable and usable." },
      { rule: "No keyboard traps", wcag: "2.1.2", how: "Focus must be able to leave every component." },
      { rule: "Skip navigation link", wcag: "2.4.1", how: "First focusable element is 'Skip to main content' link." },
      { rule: "Page has descriptive title", wcag: "2.4.2", how: "Each page has a unique, descriptive <title>." },
      { rule: "Focus order is logical", wcag: "2.4.3", how: "Tab order follows visual layout. No random jumps." },
      { rule: "Focus indicators visible", wcag: "2.4.7", how: "Focused elements have a visible outline or ring." },
    ],
  },
  {
    category: "Understandable",
    items: [
      { rule: "Page language declared", wcag: "3.1.1", how: "Set lang attribute on <html> element." },
      { rule: "Error messages identify the field", wcag: "3.3.1", how: "Show error next to the field, not just at top of form." },
      { rule: "Labels on all form inputs", wcag: "3.3.2", how: "Every input has a visible <label> with htmlFor." },
      { rule: "Error suggestions provided", wcag: "3.3.3", how: "Tell user what to fix, not just that it's wrong." },
    ],
  },
  {
    category: "Robust",
    items: [
      { rule: "ARIA roles used correctly", wcag: "4.1.2", how: "Custom components have appropriate role, state, and value." },
      { rule: "Status messages announced", wcag: "4.1.3", how: "Status updates (errors, progress, success) are exposed to assistive tech without stealing focus." },
    ],
  },
];

export default function WcagChecklistPage() {
  return (
    <MarketingShell>
      <JsonLd
        data={articleSchema({
          headline: "WCAG 2.2 AA Checklist",
          description:
            "A practical checklist for WCAG 2.2 AA compliance. Covers perceivable, operable, understandable, and robust criteria with examples.",
          path: "/guides/wcag-checklist",
        })}
      />
      <p className="font-mono text-xs text-muted-foreground">
        <span className="rounded-sm border border-border px-2.5 py-1">reference · wcag 2.2 aa</span>
      </p>
      <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">WCAG 2.2 AA Checklist</h1>
      <p className="mt-4 font-serif text-lg leading-relaxed text-muted-foreground">
        A practical checklist for meeting WCAG 2.2 Level AA. These are the criteria that matter
        most for real users — not just compliance checkboxes.
      </p>

      <h2 className="sr-only">Checklist by principle</h2>
      <BoxDivider label="checklist" className="mt-10" />

      {checks.map((section) => (
        <div key={section.category} className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">{section.category}</h2>
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {section.items.map((item) => (
              <li key={item.wcag} className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-medium">{item.rule}</h3>
                  <WcagCitation code={item.wcag} className="mt-0.5 shrink-0" />
                </div>
                <p className="mt-2 font-serif text-sm leading-relaxed text-muted-foreground">{item.how}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="mt-12 border-t border-border pt-8">
        <h2 className="text-lg font-semibold tracking-tight">Test your site automatically</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Personaudit crawls your site and runs{" "}
          <strong className="font-medium text-foreground">axe-core</strong> at every state —
          deterministic, citable checks against these criteria. Personas measure task success;
          they never render the compliance verdict.
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
