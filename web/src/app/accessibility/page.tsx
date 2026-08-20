import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = {
  alternates: { canonical: "/accessibility" },
  title: "Accessibility Statement",
  description: "Personaudit's commitment to accessibility, the standard we hold our own site to, and how to report a barrier.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

const focusLink =
  "rounded-sm text-foreground underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";

export default function AccessibilityPage() {
  return (
    <MarketingShell>
      <h1 className="text-2xl font-semibold tracking-tight font-heading">Accessibility Statement</h1>
      <p className="mt-2 text-xs text-muted-foreground">Last updated: 20 August 2026.</p>

      <div className="mt-6 space-y-3 text-sm text-muted-foreground">
        <p>
          Personaudit sells accessibility testing, so we hold our own site to the standard we
          measure others against.
        </p>

        <Section title="Standard we target">
          <p>
            We aim to conform to <strong className="text-foreground">WCAG 2.2 Level AA</strong>.
            WCAG 2.2 is backwards-compatible with WCAG 2.1 and WCAG 2.0, which are the versions
            commonly referenced by current laws and procurement standards.
          </p>
        </Section>

        <Section title="How we hold ourselves to it">
          <p>
            Every public page of this site is scanned with axe-core (the same engine the product
            runs) in both light and dark themes on every change, and our build fails on any
            violation. We test keyboard navigation and visible focus, respect reduced-motion
            preferences, and verify colour contrast in both themes.
          </p>
        </Section>

        <Section title="Known limitations">
          <p>
            Automated testing does not catch everything, and it is not a substitute for testing with
            people who use assistive technology. We do not simulate disabled users; for testing with
            real disabled testers we point you to{" "}
            <a
              href="https://makeitfable.com/"
              target="_blank"
              rel="noopener noreferrer"
              className={focusLink}
            >
              Fable
            </a>
            . Signed-in application areas are held to the same bar but are not yet in the automated
            public scan.
          </p>
        </Section>

        <Section title="Report a barrier">
          <p>
            If you hit an accessibility barrier on this site, tell us at{" "}
            <a href="mailto:hello@personaudit.com" className={focusLink}>
              hello@personaudit.com
            </a>{" "}
            and we will prioritise a fix.
          </p>
        </Section>
      </div>
    </MarketingShell>
  );
}
