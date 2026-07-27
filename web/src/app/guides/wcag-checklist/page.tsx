import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "WCAG 2.1 AA Checklist",
  description: "A practical checklist for WCAG 2.1 AA compliance. Covers perceivable, operable, understandable, and robust criteria with examples.",
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
      { rule: "Valid HTML", wcag: "4.1.1", how: "No duplicate IDs, proper nesting, closed tags." },
      { rule: "ARIA roles used correctly", wcag: "4.1.2", how: "Custom components have appropriate role, state, and value." },
    ],
  },
];

export default function WcagChecklistPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight font-heading">WCAG 2.1 AA Checklist</h1>
      <p className="mt-4 text-muted-foreground">
        A practical checklist for meeting WCAG 2.1 Level AA. These are the criteria that matter
        most for real users — not just compliance checkboxes.
      </p>

      {checks.map((section) => (
        <div key={section.category} className="mt-10">
          <h2 className="text-xl font-semibold">{section.category}</h2>
          <div className="mt-4 space-y-4">
            {section.items.map((item) => (
              <div key={item.wcag} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-medium">{item.rule}</h3>
                  <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs font-mono">{item.wcag}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.how}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-12 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h2 className="text-lg font-semibold">Test your site automatically</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Personaudit checks these criteria using AI personas that actually browse your site.
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
