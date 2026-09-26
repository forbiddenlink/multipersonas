import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { JsonLd, articleSchema } from "@/components/json-ld";
import { ContentArticle } from "@/components/dossier/content-article";

export const metadata: Metadata = {
  alternates: { canonical: "/guides/screen-reader-testing" },
  title: "Screen reader testing guide",
  description:
    "How to test a website with a screen reader. Covers VoiceOver, NVDA, and JAWS, with what to check and where automated tooling helps first.",
};

const screenReaders = [
  {
    name: "VoiceOver",
    platform: "macOS / iOS",
    free: true,
    setup: "System Settings → Accessibility → VoiceOver, or press Cmd+F5.",
    keyCommands: "VO keys = Ctrl+Option. Navigate: VO+Right Arrow. Activate: VO+Space.",
  },
  {
    name: "NVDA",
    platform: "Windows",
    free: true,
    setup: "Download from nvaccess.org, install, then Caps Lock or Insert is the modifier key.",
    keyCommands: "Navigate: Tab / arrow keys. Read the page: NVDA+Down Arrow. Elements list: NVDA+F7.",
  },
  {
    name: "JAWS",
    platform: "Windows",
    free: false,
    setup: "Licensed software from Freedom Scientific: the tool most enterprise audits still expect.",
    keyCommands: "Navigate: Tab / arrow keys. Virtual cursor links list: Insert+F7.",
  },
] as const;

const whatToTest = [
  { check: "Page title is announced correctly", why: "It's the first thing a screen reader user hears, and it has to identify the page." },
  { check: "Headings create a navigable outline", why: "Users jump between headings to scan a page the way a sighted user scans visually." },
  { check: "Images are described or skipped", why: "A meaningful image needs alt text; a decorative one should be hidden from the tree." },
  { check: "Forms are labeled, errors are announced", why: "A user needs to know what a field is for, and what went wrong when it fails." },
  { check: "Links and buttons have descriptive text", why: "\"Click here\" is meaningless once it's pulled out of context in a links list." },
  { check: "Dynamic content is announced", why: "Toasts, alerts, and live updates need an aria-live region or they pass silently." },
  { check: "Focus is managed in modals", why: "Opening a modal has to move focus in; closing it has to return focus to where it left." },
  { check: "Tables have real headers", why: "A screen reader uses <th> to announce the row/column context for each cell." },
] as const;

export default function ScreenReaderTestingPage() {
  return (
    <MarketingShell narrow={false}>
      <JsonLd
        data={articleSchema({
          headline: "Screen reader testing guide",
          description:
            "How to test a website with a screen reader. Covers VoiceOver, NVDA, and JAWS, with what to check and where automated tooling helps first.",
          path: "/guides/screen-reader-testing",
          datePublished: "2026-05-04",
          dateModified: "2026-09-26",
        })}
      />
      <ContentArticle
        eyebrow="Field guide · manual testing"
        title="Screen reader testing guide"
        dek="Testing with a real screen reader, ideally with disabled testers, is the gold standard for accessibility validation. Nothing automated replaces it. Here's how to run that pass, and where automated tooling clears the deterministic issues first."
        lastReviewed="26 September 2026"
        toc={[
          { id: "readers", label: "Screen readers to use" },
          { id: "what-to-check", label: "What to check" },
        ]}
      >
        <h2 id="readers">Screen readers to use</h2>
        <ul>
          {screenReaders.map((sr) => (
            <li key={sr.name}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-sans font-medium not-italic text-foreground">{sr.name}</span>
                <span className="label-mono rounded-sm border border-border px-1.5 py-0.5">{sr.platform}</span>
                {sr.free ? <span className="label-mono rounded-sm border border-border px-1.5 py-0.5">Free</span> : null}
              </div>
              <p className="mt-1.5">{sr.setup}</p>
              <p className="mt-1">
                <strong>Key commands.</strong> {sr.keyCommands}
              </p>
            </li>
          ))}
        </ul>

        <h2 id="what-to-check">What to check</h2>
        <ul>
          {whatToTest.map((item) => (
            <li key={item.check}>
              <span className="font-sans font-medium not-italic text-foreground">{item.check}</span>
              <p className="mt-1">{item.why}</p>
            </li>
          ))}
        </ul>

        <h2 className="sr-only">Clear the automatable issues first</h2>
        <p>
          Personaudit does <strong>not</strong> simulate a screen reader user. It drives a site
          keyboard-only and runs axe-core at every state it reaches, including flows behind a
          saved login, so the deterministic violations are cleared before a manual
          screen-reader pass. It complements that pass; it never replaces it.
        </p>

        <h2 className="sr-only">Related guides</h2>
        <ul>
          <li>
            <Link href="/guides/wcag-checklist" className="text-link">
              WCAG 2.2 AA checklist
            </Link>
          </li>
          <li>
            <Link href="/guides/common-accessibility-issues" className="text-link">
              10 most common accessibility issues
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
