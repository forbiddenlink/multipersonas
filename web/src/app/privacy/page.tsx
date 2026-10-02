import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";
import { ContentArticle } from "@/components/dossier/content-article";

export const metadata: Metadata = {
  alternates: { canonical: "/privacy" },
  title: "Privacy policy",
  description: "How Personaudit handles your data, authentication, subprocessors, and your rights.",
};

export default function PrivacyPage() {
  return (
    <MarketingShell narrow={false}>
      <ContentArticle
        eyebrow="Privacy policy"
        title="What we collect, and what we don't do"
        mark="what we don't do"
        lastReviewed="23 September 2026"
        toc={[
          { id: "collect", label: "What we collect" },
          { id: "subprocessors", label: "Subprocessors" },
          { id: "storage", label: "Storage and access" },
          { id: "rights", label: "Your rights" },
          { id: "dont-do", label: "What we don't do" },
        ]}
      >
        <p>
          This policy explains what Personaudit collects, why, who processes it on our behalf,
          and the rights you have over it.
        </p>

        <h2 id="collect">What we collect</h2>
        <p>
          <strong>Account data.</strong> Your email address and a password hash, for
          authentication.
        </p>
        <p>
          <strong>Audit data.</strong> The URLs you submit and the results we generate for
          them, accessibility violations and persona findings, stored against your account so
          you can track them over time.
        </p>
        <p>
          <strong>When you run an audit,</strong> we browse the URL you provide with automated
          browsers to inspect it. Persona runs can retain screenshots, visited URLs, actions,
          generated reasoning, and task-check results so you can replay the run. Screenshots
          and page context can include content visible on the audited site. Do not submit
          credentials, personal information, or confidential content in task instructions.
        </p>

        <h2 id="subprocessors">Subprocessors</h2>
        <p>We rely on these services to run Personaudit. Each processes only what its function requires.</p>
        <ul>
          <li><strong>Supabase</strong>: authentication, database, and private screenshot storage (your account and audit data).</li>
          <li>
            <strong>Anthropic</strong>: the AI (Claude) that produces persona usability
            findings; the page context of an audited site is sent to their API. See{" "}
            <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-link">
              Anthropic&apos;s privacy policy
            </a>
            .
          </li>
          <li>
            <strong>Stripe</strong>: checkout and billing. We send your account identifier and
            email, or an existing Stripe customer identifier, to link your subscription.
            Payment details are collected by Stripe. See{" "}
            <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-link">
              Stripe&apos;s privacy policy
            </a>
            .
          </li>
          <li><strong>Cloudflare Turnstile</strong>: abuse prevention when configured.</li>
          <li><strong>Vercel</strong>: web hosting and delivery.</li>
          <li><strong>Railway</strong>: the worker that runs browser audits.</li>
          <li><strong>Sentry</strong>: error monitoring (active only when configured); we scrub personal data from error reports.</li>
          <li>
            <strong>PostHog</strong>: product analytics (active only when configured); we
            capture pageviews and coarse product events, disable session recording and
            autocapture, respect Do Not Track, remove query strings from URLs, and never send
            emails, notes, result tokens, or full submitted URLs.
          </li>
        </ul>

        <h2 id="storage">Storage and access</h2>
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
        <p>To request deletion of your account or other stored data, contact us below.</p>

        <h2 id="rights">Your rights</h2>
        <p>
          You can request access to, an export of, or deletion of your data at any time.
          Contact us at the address below for account export or deletion requests.
        </p>
        <p>
          Depending on where you live, you may have additional rights under the GDPR (EU/UK) or
          CCPA (California). We honor these requests regardless of jurisdiction.
        </p>

        <h2 id="dont-do">What we don&apos;t do</h2>
        <p>
          We do not sell your data. We do not use advertising trackers. When product analytics
          are enabled, they are limited to privacy-conservative pageview and product-flow
          analytics; otherwise we set no non-essential cookies (only the session cookie
          required to keep you signed in).
        </p>

        <h2>Contact</h2>
        <p>
          Privacy questions or data requests:{" "}
          <a href="mailto:hello@personaudit.com" className="text-link">
            hello@personaudit.com
          </a>
          .
        </p>
      </ContentArticle>
    </MarketingShell>
  );
}
