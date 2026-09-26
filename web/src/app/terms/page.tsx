import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { ContentArticle } from "@/components/dossier/content-article";

export const metadata: Metadata = {
  alternates: { canonical: "/terms" },
  title: "Terms of service",
  description: "Terms for using Personaudit accessibility and usability testing.",
};

export default function TermsPage() {
  return (
    <MarketingShell narrow={false}>
      <ContentArticle
        eyebrow="The fine print"
        title="Terms of service"
        lastReviewed="4 September 2026"
        toc={[
          { id: "what-it-does", label: "What the service does" },
          { id: "acceptable-use", label: "Acceptable use" },
          { id: "findings", label: "How findings are produced" },
          { id: "founding-access", label: "Founding access" },
          { id: "warranty", label: "No warranty" },
        ]}
      >
        <p>
          Personaudit is operated by Elizabeth Stein (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By
          using it, you agree to these terms.
        </p>

        <h2 id="what-it-does">What the service does</h2>
        <p>
          Personaudit runs axe-core and AI-driven UX personas against websites to find
          accessibility and usability issues. When you submit a URL, our system browses that
          site with automated browsers.
        </p>

        <h2 id="acceptable-use">Acceptable use</h2>
        <p>
          <strong>Only submit URLs for sites you own or are authorized to test.</strong> Do not
          use the service to scan sites without permission, to probe infrastructure you do not
          control, or to attempt to overload, disrupt, or circumvent access controls on any
          site. You are responsible for having the right to test any URL you submit.
        </p>
        <p>
          Do not attempt to abuse, overload, or reverse the service itself, or use it to
          generate excessive automated load.
        </p>

        <h2 id="findings">How findings are produced</h2>
        <p>
          Accessibility violations come from <strong>axe-core</strong> and are deterministic,
          not AI-generated. Usability and task-success findings come from AI personas and are
          opinion: they may contain inaccuracies and are not authoritative for accessibility
          compliance. Do not rely on persona findings as the sole basis for compliance
          decisions, and verify results before acting on them.
        </p>

        <h2 id="founding-access">Founding access: billing, cancellation, and refunds</h2>
        <p>
          Founding access is a <strong>paid pre-order</strong> at $199 per month, billed
          monthly through Stripe until you cancel. The founding price stays fixed for as long
          as the subscription runs continuously.
        </p>
        <p>
          <strong>What you are buying, plainly.</strong> You get every hosted capability that
          exists today: multi-site projects, new-versus-cleared findings against the previous
          run, scheduled re-scans, the CI gate, and the white-labeled verdicts-only report.
          Running authenticated, behind-login scans <em>hosted</em> is not built yet. It runs
          in the CLI meanwhile, and it is what founding access funds. You are paying before
          that ships, and we would rather say so here than let you find out later.
        </p>
        <p>
          <strong>Cancellation.</strong> You can cancel at any time. Cancelling stops future
          charges, and access continues to the end of the period you have already paid for. We
          do not pro-rate a partial month by default.
        </p>
        <p>
          <strong>Refund commitment.</strong> If hosted behind-login scanning is never
          delivered, you get every dollar you paid for founding access back, on request, with
          no time limit and no argument. That is the obligation attached to selling a
          capability before it exists. Ask for it at{" "}
          <a href="mailto:hello@personaudit.com" className="text-link">
            hello@personaudit.com
          </a>{" "}
          and we will process it.
        </p>

        <h2 id="warranty">No warranty; limitation of liability</h2>
        <p>
          The service is provided <strong>&ldquo;as is&rdquo;</strong>, without warranties of
          any kind. We do not guarantee that audits find all issues, that findings are
          accurate, or that a passing result means legal compliance. To the maximum extent
          permitted by law, we are not liable for indirect, incidental, or consequential
          damages arising from use of the service.
        </p>

        <h2>Accessibility</h2>
        <p>
          We hold our own site to the standard we sell. See our{" "}
          <Link href="/accessibility" className="text-link">
            accessibility statement
          </Link>
          .
        </p>

        <h2>Governing law</h2>
        <p>
          These terms are governed by the laws of the United States and the state in which the
          operator is established, without regard to conflict-of-laws rules. Disputes will be
          handled in that jurisdiction.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms:{" "}
          <a href="mailto:hello@personaudit.com" className="text-link">
            hello@personaudit.com
          </a>
          .
        </p>
      </ContentArticle>
    </MarketingShell>
  );
}
