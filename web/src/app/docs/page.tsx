import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { BoxDivider } from "@/components/forensic/divider";
import { JsonLd, articleSchema } from "@/components/json-ld";

export const metadata: Metadata = {
  alternates: { canonical: "/docs" },
  title: "CLI docs — install and first scan",
  description:
    "Install the Personaudit CLI, save a login session on your own machine, and run axe-core at every state the site reaches. No API key, no account.",
};

const PRE =
  "mt-4 overflow-x-auto rounded-sm border border-border bg-background p-4 font-mono text-xs leading-relaxed text-foreground";
const LINK =
  "rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";

export default function DocsPage() {
  return (
    <MarketingShell>
      <JsonLd
        data={articleSchema({
          headline: "Personaudit CLI — install and first scan",
          description:
            "Install the CLI, save a session, scan behind a login, and gate CI on new accessibility defects.",
          path: "/docs",
          datePublished: "2026-09-24",
          dateModified: "2026-09-24",
        })}
      />

      <h1 className="text-balance text-3xl font-semibold tracking-tight">
        Install and run your first scan
      </h1>
      <p className="mt-4 text-pretty text-muted-foreground">
        The CLI is the whole compliance path. It needs no API key and no account:{" "}
        <code className="font-mono text-foreground">scan</code> drives a real Chromium,
        crawls every same-origin state it can reach, and runs axe-core at each one.
      </p>

      <BoxDivider label="install" className="mt-10 mb-2" />
      <p className="text-sm text-muted-foreground">
        Node 20 or newer. The package installs two names for the same binary,{" "}
        <code className="font-mono text-foreground">personaudit</code> and the older{" "}
        <code className="font-mono text-foreground">mpersonas</code>.
      </p>
      <pre tabIndex={0} role="region" aria-label="Install commands" className={PRE}>
{`npm i -g personaudit
npx playwright install --with-deps chromium

personaudit --help`}
      </pre>

      <BoxDivider label="scan a public site" className="mt-10 mb-2" />
      <p className="text-sm text-muted-foreground">
        Start here. Nothing is sent anywhere; the report is written next to you.
      </p>
      <pre tabIndex={0} role="region" aria-label="Public scan command" className={PRE}>
{`personaudit scan https://example.com`}
      </pre>

      <BoxDivider label="scan behind a login" className="mt-10 mb-2" />
      <p className="text-sm text-muted-foreground">
        <code className="font-mono text-foreground">auth</code> opens a browser, waits while
        you sign in by hand, and saves the session to a file with mode 0600. Treat that file
        like a password: it holds live cookies. It stays on your machine, and the hosted
        service never asks for it.
      </p>
      <pre tabIndex={0} role="region" aria-label="Authenticated scan commands" className={PRE}>
{`personaudit auth https://app.example.com --save ./session.json

personaudit scan https://app.example.com --session ./session.json`}
      </pre>

      <BoxDivider label="gate CI on new defects" className="mt-10 mb-2" />
      <p className="text-sm text-muted-foreground">
        Snapshot today&apos;s backlog once and commit it. After that the build fails only on
        defects the branch introduced, so an existing backlog never blocks a release.
      </p>
      <pre tabIndex={0} role="region" aria-label="Baseline and gate commands" className={PRE}>
{`# once — commit the baseline
personaudit scan https://app.example.com --session ./session.json \\
  --baseline mpersonas-baseline.json --update-baseline

# in CI — exit 2 only on NEW defects at or above serious
personaudit scan https://app.example.com --session ./session.json \\
  --baseline mpersonas-baseline.json --fail-on serious`}
      </pre>
      <p className="mt-4 text-sm text-muted-foreground">
        A ready-to-paste GitHub Actions workflow is in the{" "}
        <Link href="/guides/ci-accessibility-gate" className={LINK}>
          CI accessibility gate guide
        </Link>
        .
      </p>

      <BoxDivider label="personas" className="mt-10 mb-2" />
      <p className="text-sm text-muted-foreground">
        <code className="font-mono text-foreground">run</code> adds LLM personas that browse
        toward a goal and report task success. It is the one command that needs{" "}
        <code className="font-mono text-foreground">ANTHROPIC_API_KEY</code>. Personas never
        render an accessibility verdict, and none of them claims a disability — that is a
        permanent product constraint, not a current limitation.
      </p>
      <pre tabIndex={0} role="region" aria-label="Persona run command" className={PRE}>
{`export ANTHROPIC_API_KEY=...
personaudit run https://example.com`}
      </pre>

      <BoxDivider label="next" className="mt-10 mb-2" />
      <ul className="space-y-2 text-sm">
        <li>
          <Link href="/pricing" className={LINK}>
            Pricing
          </Link>{" "}
          — what the hosted workspace adds on top of the CLI.
        </li>
        <li>
          <Link href="/guides/wcag-checklist" className={LINK}>
            WCAG 2.2 AA checklist
          </Link>{" "}
          — what the rules the scan cites actually require.
        </li>
        <li>
          <Link href="/grade" className={LINK}>
            Free grade
          </Link>{" "}
          — up to 10 public pages in the browser, no install.
        </li>
      </ul>
    </MarketingShell>
  );
}
