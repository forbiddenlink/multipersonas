import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";
import { ContentArticle } from "@/components/dossier/content-article";

export const metadata: Metadata = {
  alternates: { canonical: "/accessibility" },
  title: "Accessibility statement",
  description:
    "Personaudit's commitment to accessibility, the standard we hold our own site to, and how to report a barrier.",
};

// Result of the last green run of .github/workflows/a11y-dogfood.yml on main (9 October
// 2026, commit bfe1bcb), which scanned the 16 public routes then listed in
// scripts/axe-dogfood.mjs. Update these constants by hand with the next green run.
const LAST_SCAN = { date: "9 October 2026", pages: 16 };
const SCAN_RUNS_URL =
  "https://github.com/forbiddenlink/multipersonas/actions/workflows/a11y-dogfood.yml";

export default function AccessibilityPage() {
  return (
    <MarketingShell narrow={false}>
      <ContentArticle
        eyebrow="The fine print"
        title="Accessibility statement"
        mark="statement"
        lastReviewed="10 October 2026"
      >
        <p>
          Personaudit sells accessibility testing, so we hold our own site to the standard we
          measure others against.
        </p>

        <h2>Standard we target</h2>
        <p>
          We aim to conform to <strong>WCAG 2.2 Level AA</strong>. WCAG 2.2 is
          backwards-compatible with WCAG 2.1 and WCAG 2.0, the versions most commonly
          referenced by current laws and procurement standards.
        </p>

        <h2>How we hold ourselves to it</h2>
        <p>
          Every public page of this site is scanned with axe-core, the same engine the product
          runs, in both light and dark themes on every change, and the build fails on any
          violation. We test keyboard navigation and visible focus, respect
          reduced-motion preferences, and verify color contrast in both themes.
        </p>
        <p>
          Last automated scan: {LAST_SCAN.date}, {LAST_SCAN.pages} public pages, both themes, 0
          axe-core violations at WCAG 2.2 AA plus best practice. See the{" "}
          <a href={SCAN_RUNS_URL} target="_blank" rel="noopener noreferrer" className="text-link">
            scan run history
          </a>
          .
        </p>

        <h2>Known limitations</h2>
        <p>
          Automated testing does not catch everything, and it is not a substitute for testing
          with people who use assistive technology. We do not simulate disabled users; for
          testing with real disabled testers, we point you to{" "}
          <a href="https://makeitfable.com/" target="_blank" rel="noopener noreferrer" className="text-link">
            Fable
          </a>
          . Signed-in application areas are held to the same bar, but are not yet in the
          automated public scan.
        </p>

        <h2>Report a barrier</h2>
        <p>
          If you hit an accessibility barrier on this site, tell us at{" "}
          <a href="mailto:hello@personaudit.com" className="text-link">
            hello@personaudit.com
          </a>{" "}
          and we will prioritize a fix.
        </p>
      </ContentArticle>
    </MarketingShell>
  );
}
