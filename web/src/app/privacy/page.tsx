import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = {
  alternates: { canonical: "/privacy" },
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
      <p className="mt-2 text-xs text-muted-foreground">Last updated: 23 September 2026.</p>

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
            you provide with automated browsers to inspect it. Persona runs can retain screenshots,
            visited URLs, actions, generated reasoning, and task-check results so you can replay
            the run. Screenshots and page context can include content visible on the audited site.
            Do not submit credentials, personal information, or confidential content in task instructions.
          </p>
        </Section>

        <Section title="Subprocessors">
          <p>We rely on these services to run Personaudit. Each processes only what its function requires:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong className="text-foreground">Supabase</strong> — authentication, database, and private screenshot storage (your account and audit data).</li>
            <li><strong className="text-foreground">Anthropic</strong> — the AI (Claude) that produces persona usability findings; the page context of an audited site is sent to their API. See <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer" className={focusLink}>Anthropic&apos;s privacy policy</a>.</li>
            <li><strong className="text-foreground">Stripe</strong> — checkout and billing. We send your account identifier and email or existing Stripe customer identifier to link your subscription. Payment details are collected by Stripe. See <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className={focusLink}>Stripe&apos;s privacy policy</a>.</li>
            <li><strong className="text-foreground">Cloudflare Turnstile</strong> — abuse prevention when configured.</li>
            <li><strong className="text-foreground">Vercel</strong> — web hosting and delivery.</li>
            <li><strong className="text-foreground">Railway</strong> — the worker that runs browser audits.</li>
            <li><strong className="text-foreground">Sentry</strong> — error monitoring (active only when configured); we scrub personal data from error reports.</li>
            <li><strong className="text-foreground">PostHog</strong> — product analytics (active only when configured); we capture pageviews and coarse product events, disable session recording and autocapture, respect Do Not Track, remove query strings from URLs, and do not send emails, notes, result tokens, or full submitted URLs.</li>
          </ul>
        </Section>

        <Section title="Storage and access">
          <p>
            Saved audit results and replay screenshots are retained to make reports and replays
            available after a run. Screenshots use private storage with temporary access links;
            expiration of a link does not delete the stored screenshot. Public grade results can
            be viewed by anyone with the result link, so treat that link as shareable.
          </p>
          <p>
            Deleting a project removes that project&apos;s saved runs and the replay screenshots
            already stored for those runs. The project is kept if those screenshots cannot be
            removed. A screenshot uploaded while deletion is in progress can remain in private
            storage. Deleting a project does not delete your account or billing records.
          </p>
          <p>
            To request deletion of your account or other stored data, contact us below.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            You can request access to, an export of, or deletion of your data at any time.
            Contact us at the address below for account export or deletion requests.
          </p>
          <p>
            Depending on where you live, you may have additional rights under the GDPR (EU/UK) or
            CCPA (California). We honour these requests regardless of jurisdiction.
          </p>
        </Section>

        <Section title="What we don't do">
          <p>
            We do not sell your data. We do not use advertising trackers. When product analytics are
            enabled, they are limited to privacy-conservative pageview and product-flow analytics; otherwise we set no
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
