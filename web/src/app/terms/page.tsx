import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using Personaudit accessibility testing service.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight font-heading">Terms of Service</h1>
      <div className="mt-6 space-y-4 text-sm text-muted-foreground">
        <p>
          By using Personaudit, you agree to the following:
        </p>
        <p>
          <strong className="text-foreground">What we do:</strong> Personaudit runs axe-core and
          AI-driven UX personas against websites to find accessibility and usability issues. When
          you submit a URL, our system browses that site using automated browsers.
        </p>
        <p>
          <strong className="text-foreground">Your responsibility:</strong> Only submit URLs for
          sites you own or have permission to test. Do not use this service to scan sites without
          authorization.
        </p>
        <p>
          <strong className="text-foreground">How findings are produced:</strong> Accessibility
          violations come from axe-core and are deterministic — not AI-generated. Usability and
          task-success findings come from AI personas and are opinion; they may contain
          inaccuracies and are not authoritative for accessibility compliance. Do not rely on the
          persona findings as the sole basis for compliance decisions. Always verify results
          manually.
        </p>
        <p>
          <strong className="text-foreground">No guarantees:</strong> This service is provided
          as-is. We do not guarantee that audits will find all accessibility issues, or that
          findings are accurate.
        </p>
        <p className="text-xs text-muted-foreground">
          Last updated: May 2026. These terms will be expanded as the product develops.
        </p>
      </div>
      <div className="mt-8">
        <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
