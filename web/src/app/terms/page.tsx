import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = {
  alternates: { canonical: "/terms" },
  title: "Terms of Service",
  description: "Terms for using Personaudit accessibility and usability testing.",
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

export default function TermsPage() {
  return (
    <MarketingShell>
      <h1 className="text-2xl font-semibold tracking-tight font-heading">Terms of Service</h1>
      <p className="mt-2 text-xs text-muted-foreground">Last updated: 2 August 2026.</p>

      <div className="mt-6 space-y-3 text-sm text-muted-foreground">
        <p>
          Personaudit is operated by Elizabeth Stein (&quot;we&quot;, &quot;us&quot;). By using it,
          you agree to these terms.
        </p>

        <Section title="What the service does">
          <p>
            Personaudit runs axe-core and AI-driven UX personas against websites to find
            accessibility and usability issues. When you submit a URL, our system browses that site
            with automated browsers.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>
            <strong className="text-foreground">Only submit URLs for sites you own or are
            authorized to test.</strong> Do not use the service to scan sites without permission, to
            probe infrastructure you do not control, or to attempt to overload, disrupt, or
            circumvent access controls on any site. You are responsible for having the right to test
            any URL you submit.
          </p>
          <p>
            Do not attempt to abuse, overload, or reverse the service itself, or use it to generate
            excessive automated load.
          </p>
        </Section>

        <Section title="How findings are produced">
          <p>
            Accessibility violations come from <strong className="text-foreground">axe-core</strong>{" "}
            and are deterministic, not AI-generated. Usability and task-success findings come from AI
            personas and are opinion: they may contain inaccuracies and are not authoritative for
            accessibility compliance. Do not rely on persona findings as the sole basis for
            compliance decisions, and verify results before acting on them.
          </p>
        </Section>

        <Section title="No warranty; limitation of liability">
          <p>
            The service is provided <strong className="text-foreground">&quot;as is&quot;</strong>,
            without warranties of any kind. We do not guarantee that audits find all issues, that
            findings are accurate, or that a passing result means legal compliance. To the maximum
            extent permitted by law, we are not liable for indirect, incidental, or consequential
            damages arising from use of the service.
          </p>
        </Section>

        <Section title="Accessibility">
          <p>
            We hold our own site to the standard we sell. See our{" "}
            <Link href="/accessibility" className={focusLink}>
              accessibility statement
            </Link>
            .
          </p>
        </Section>

        <Section title="Governing law">
          <p>
            These terms are governed by the laws of the United States and the state in which the
            operator is established, without regard to conflict-of-laws rules. Disputes will be
            handled in that jurisdiction.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these terms:{" "}
            <a href="mailto:hello@personaudit.com" className={focusLink}>
              hello@personaudit.com
            </a>
            .
          </p>
        </Section>
      </div>
    </MarketingShell>
  );
}
