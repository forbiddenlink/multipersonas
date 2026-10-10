import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { ContentArticle } from "@/components/dossier/content-article";

export const metadata: Metadata = {
  alternates: { canonical: "/security" },
  title: "Security",
  description:
    "How Personaudit protects your sessions, your data, and the sites it scans: the SSRF guard, the egress proxy, account isolation, and how to report a vulnerability.",
};

export default function SecurityPage() {
  return (
    <MarketingShell narrow={false}>
      <ContentArticle
        eyebrow="The fine print"
        title="What we protect, and how"
        mark="how"
        lastReviewed="10 October 2026"
        toc={[
          { id: "logins", label: "Behind-login scans" },
          { id: "scanner", label: "The scanner itself" },
          { id: "data", label: "Your account data" },
          { id: "report", label: "Report a vulnerability" },
        ]}
      >
        <p>
          A scanner that browses the sites you point it at is a target in its own right. This
          page lists the specific protections in place today, and the limits we know about.
        </p>

        <h2 id="logins">Behind-login scans</h2>
        <p>
          Scanning behind a login runs through the CLI, on your machine. The CLI saves the
          signed-in browser session to a local file written with owner-only permissions, and
          refuses to use a session file that other users on the machine can read. The session
          is never uploaded to us. The hosted service scans public pages only.
        </p>

        <h2 id="scanner">The scanner itself</h2>
        <p>
          Every navigation, whether the starting URL, a link a persona follows, or a redirect,
          is checked before the browser loads it. The check resolves the hostname and refuses
          loopback, private network, link-local (including the cloud metadata address
          169.254.169.254), carrier-grade NAT, and the IPv6 equivalents, including addresses
          wrapped inside IPv6.
        </p>
        <p>
          Checking an address and then connecting to it leaves a gap a hostile DNS server can
          exploit. On the hosted worker, that gap is closed at the network layer: all browser
          traffic goes through an egress proxy that re-checks every connection as it opens, and
          the worker refuses to start a browser if that proxy is missing. The option to scan
          private addresses exists only in the CLI, for testing your own local builds, and the
          hosted service never enables it.
        </p>

        <h2 id="data">Your account data</h2>
        <p>
          Accounts, projects, and results live in Supabase with row-level security on every
          table, so the database itself refuses to return one account&apos;s rows to another.
          Persona replay screenshots are stored in a private bucket and served through
          temporary links. Payments are handled by Stripe; we never see card numbers. The
          full list of subprocessors, and what each one receives, is in the{" "}
          <Link href="/privacy#subprocessors" className="text-link">
            privacy policy
          </Link>
          .
        </p>

        <h2 id="report">Report a vulnerability</h2>
        <p>
          Report security problems privately through{" "}
          <a
            href="https://github.com/forbiddenlink/multipersonas/security/advisories/new"
            target="_blank"
            rel="noopener noreferrer"
            className="text-link"
          >
            GitHub private vulnerability reporting
          </a>
          , not in a public issue. Personaudit is maintained by one person, so there is no
          response-time guarantee and no bug bounty, but every report is read and credit is
          offered in the fix notes. The scope and known limits are in{" "}
          <a
            href="https://github.com/forbiddenlink/multipersonas/blob/main/SECURITY.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-link"
          >
            SECURITY.md
          </a>
          , and the machine-readable contact is at{" "}
          <a href="/.well-known/security.txt" className="text-link">
            /.well-known/security.txt
          </a>
          .
        </p>
      </ContentArticle>
    </MarketingShell>
  );
}
