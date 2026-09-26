import type { Metadata } from "next";
import Link from "next/link";
import { WcagCitation } from "@/components/forensic/wcag-citation";
import { MarketingShell } from "@/components/marketing-shell";
import { JsonLd, articleSchema } from "@/components/json-ld";
import { ContentArticle } from "@/components/dossier/content-article";

export const metadata: Metadata = {
  alternates: { canonical: "/guides/wcag-checklist" },
  title: "WCAG 2.2 AA checklist",
  description:
    "A practical checklist for WCAG 2.2 AA. Covers perceivable, operable, understandable, and robust criteria with examples.",
};

const checks = [
  {
    category: "Perceivable",
    items: [
      { rule: "Images have alt text", wcag: "1.1.1", how: "Add an alt attribute to every <img>. Decorative images use alt=\"\"." },
      { rule: "Video has captions", wcag: "1.2.2", how: "Add closed captions to pre-recorded video with dialogue." },
      { rule: "Color is not the only indicator", wcag: "1.4.1", how: "Pair color with an icon, text label, or pattern." },
      { rule: "Text contrast is 4.5:1 minimum", wcag: "1.4.3", how: "Check with browser devtools or a contrast checker; 3:1 for large text." },
      { rule: "Text resizes to 200% without loss", wcag: "1.4.4", how: "Use relative units (rem, em), not fixed px, for text." },
    ],
  },
  {
    category: "Operable",
    items: [
      { rule: "All functionality works by keyboard", wcag: "2.1.1", how: "Tab through the whole page. Every control must be reachable and usable." },
      { rule: "No keyboard traps", wcag: "2.1.2", how: "Focus must be able to leave every component, including custom widgets." },
      { rule: "Skip navigation link", wcag: "2.4.1", how: "The first focusable element is a \"Skip to main content\" link." },
      { rule: "Page has a descriptive title", wcag: "2.4.2", how: "Each page has a unique, descriptive <title>." },
      { rule: "Focus order is logical", wcag: "2.4.3", how: "Tab order follows the visual layout. No jumps that ignore reading order." },
      { rule: "Focus indicators are visible", wcag: "2.4.7", how: "Focused elements keep a visible outline or ring; never outline: none with nothing in its place." },
    ],
  },
  {
    category: "Understandable",
    items: [
      { rule: "Page language is declared", wcag: "3.1.1", how: "Set the lang attribute on <html>." },
      { rule: "Error messages identify the field", wcag: "3.3.1", how: "Show the error next to the field, not only in a banner at the top." },
      { rule: "Labels on every form input", wcag: "3.3.2", how: "Every input has a visible <label> with a matching htmlFor." },
      { rule: "Error suggestions are provided", wcag: "3.3.3", how: "Tell the user what to fix, not only that a field is wrong." },
    ],
  },
  {
    category: "Robust",
    items: [
      { rule: "ARIA roles are used correctly", wcag: "4.1.2", how: "Custom components expose the right role, state, and value." },
      { rule: "Status messages are announced", wcag: "4.1.3", how: "Errors, progress, and success are exposed to assistive tech without stealing focus." },
    ],
  },
] as const;

const TOC = checks.map((s) => ({ id: s.category.toLowerCase(), label: s.category }));

export default function WcagChecklistPage() {
  return (
    <MarketingShell narrow={false}>
      <JsonLd
        data={articleSchema({
          headline: "WCAG 2.2 AA checklist",
          description:
            "A practical checklist for WCAG 2.2 AA. Covers perceivable, operable, understandable, and robust criteria with examples.",
          path: "/guides/wcag-checklist",
          datePublished: "2026-05-04",
          dateModified: "2026-09-26",
        })}
      />
      <ContentArticle
        eyebrow="Field guide · reference"
        title="WCAG 2.2 AA checklist"
        dek="A practical checklist for meeting WCAG 2.2 Level AA: the criteria that show up most in real audits, grouped under the four principles the standard is built on."
        lastReviewed="26 September 2026"
        toc={TOC}
      >
        {checks.map((section) => (
          <div key={section.category}>
            <h2 id={section.category.toLowerCase()}>{section.category}</h2>
            <ul>
              {section.items.map((item) => (
                <li key={item.wcag}>
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-sans font-medium not-italic text-foreground">{item.rule}</span>
                    <WcagCitation code={item.wcag} className="mt-0.5 shrink-0" />
                  </div>
                  <p className="mt-1 text-[0.9375rem] text-muted-foreground">{item.how}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <h2 className="sr-only">Automate what&apos;s automatable</h2>
        <p>
          Personaudit crawls your site and runs <strong>axe-core</strong> at every state it
          reaches, deterministic and citable checks against these criteria. Persona notes
          measure task success; they never render the compliance verdict.
        </p>

        <h2 className="sr-only">Related guides</h2>
        <ul>
          <li>
            <Link href="/guides/common-accessibility-issues" className="text-link">
              The 10 most common accessibility issues
            </Link>
          </li>
          <li>
            <Link href="/guides/ci-accessibility-gate" className="text-link">
              CI accessibility gate
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
