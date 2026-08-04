import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Personaudit handles your data, authentication, subprocessors, and your rights.",
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

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <h1 className="text-2xl font-semibold tracking-tight font-heading">Privacy Policy</h1>
      <p className="mt-2 text-xs text-muted-foreground">Last updated: 2 August 2026.</p>

      <div className="mt-6 space-y-3 text-sm text-muted-foreground">
        <p>
          This policy explains what Personaudit collects, why, who processes it on our behalf,
          and the rights you have over it.
        </p>

        <Section title="What we collect">
          <p>
            <strong className="text-foreground">Account data:</strong> your email address and a
            password hash, for authentication.
          </p>
          <p>
            <strong className="text-foreground">Audit data:</strong> the URLs you submit and the
            results we generate for them (accessibility violations and persona findings), stored
            against your account so you can track them over time.
          </p>
          <p>
            <strong className="text-foreground">When you run an audit,</strong> we browse the URL
            you provide with automated browsers to inspect it. We do not retain screenshots or page
            content after the audit completes; we keep only the findings.
          </p>
        </Section>

        <Section title="Subprocessors">
          <p>We rely on these services to run Personaudit. Each processes only what its function requires:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong className="text-foreground">Supabase</strong> — authentication and database (your account and audit data).</li>
            <li><strong className="text-foreground">Anthropic</strong> — the AI (Claude) that produces persona usability findings; the page context of an audited site is sent to their API. See <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer" className={focusLink}>Anthropic&apos;s privacy policy</a>.</li>
            <li><strong className="text-foreground">Vercel</strong> — web hosting and delivery.</li>
            <li><strong className="text-foreground">Railway</strong> — the worker that runs browser audits.</li>
            <li><strong className="text-foreground">Sentry</strong> — error monitoring (active only when configured); we scrub personal data from error reports.</li>
          </ul>
        </Section>

        <Section title="Your rights">
          <p>
            You can request access to, an export of, or deletion of your data at any time. Deleting
            your account removes your account record and its associated audits. To request deletion
            or export, contact us at the address below (self-service controls are on the roadmap).
          </p>
          <p>
            Depending on where you live, you may have additional rights under the GDPR (EU/UK) or
            CCPA (California). We honour these requests regardless of jurisdiction.
          </p>
        </Section>

        <Section title="What we don't do">
          <p>
            We do not sell your data. We do not use analytics or advertising trackers, and we set no
            non-essential cookies (only the session cookie required to keep you signed in).
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Privacy questions or data requests:{" "}
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
