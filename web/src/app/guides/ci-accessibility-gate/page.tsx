import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { BoxDivider } from "@/components/forensic/divider";

export const metadata: Metadata = {
  title: "CI accessibility gate",
  description:
    "Fail the build only on new axe-core defects. Baseline today's backlog, then gate PRs on regressions — deterministic, keyless, works behind a saved session.",
};

export default function CiGateGuidePage() {
  return (
    <MarketingShell>
      <p className="font-mono text-xs text-muted-foreground">
        <span className="rounded-sm border border-border px-2.5 py-1">guide · ci gate</span>
      </p>
      <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
        Fail the build only on new defects
      </h1>
      <p className="mt-4 font-serif text-lg leading-relaxed text-muted-foreground">
        Snapshot today&apos;s backlog once. Then every PR fails only when{" "}
        <strong className="font-medium text-foreground">axe-core</strong> finds a new critical or
        serious violation — including states behind a saved login session. Deterministic. No API
        key. Existing issues stay ignored until you clear them.
      </p>

      <h2 className="sr-only">How the gate works</h2>
      <BoxDivider label="how it works" className="mt-10" />

      <ol className="mt-6 divide-y divide-border border-y border-border font-mono text-sm">
        {[
          {
            step: "1",
            title: "Capture a session (optional)",
            body: "For behind-login sites: authenticate once locally and save storage state. Cookies never need to live in your repo — store them as a CI secret.",
          },
          {
            step: "2",
            title: "Write a baseline",
            body: "Run scan with --update-baseline against staging or production. Commit the JSON. That freezes today's backlog.",
          },
          {
            step: "3",
            title: "Gate PRs on regressions",
            body: "CI runs scan with --fail-on serious. Exit 2 only when new defects appear at or above that severity.",
          },
        ].map((row) => (
          <li key={row.step} className="flex gap-4 py-4">
            <span className="select-none text-[var(--primary)]">{row.step}</span>
            <div>
              <p className="font-sans font-medium text-foreground">{row.title}</p>
              <p className="mt-1 font-sans text-sm leading-relaxed text-muted-foreground">
                {row.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">CLI</h2>
      <pre className="mt-4 overflow-x-auto rounded-sm border border-border bg-card p-4 font-mono text-xs leading-relaxed text-foreground">
{`# once — authenticate and save session (local machine)
mpersonas auth https://app.example.com --save ./session.json

# once — snapshot today's defects
mpersonas scan https://app.example.com --session ./session.json \\
  --baseline mpersonas-baseline.json --update-baseline

# CI — exit 2 only on NEW defects at/above serious
mpersonas scan https://app.example.com --session ./session.json \\
  --baseline mpersonas-baseline.json --fail-on serious`}
      </pre>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">GitHub Action</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Ready-to-use workflow: restore an optional session secret, scan against{" "}
        <code className="font-mono text-xs text-foreground">vars.MPERSONAS_TARGET_URL</code>, upload
        the Markdown report as an artifact.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        <a
          href="https://github.com/forbiddenlink/multipersonas/tree/main/examples/github-actions"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-sm font-medium text-foreground underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        >
          examples/github-actions
        </a>
      </p>

      <BoxDivider label="honesty" className="mt-10" />
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        The gate uses <strong className="font-medium text-foreground">axe-core</strong> only —
        deterministic verdicts. Personas measure task success in the product loop; they never enter
        the CI baseline or fail the build. This does not replace testing with disabled people.
      </p>

      <div className="mt-12 border-t border-border pt-8">
        <h2 className="text-lg font-semibold tracking-tight">Agencies shipping many client sites</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Pair the CI gate with per-client projects and a print-ready report. Early access is open.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/for-agencies#early-access"
            className="inline-flex rounded-sm bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            Get early access
          </Link>
          <Link
            href="/#scan"
            className="inline-flex rounded-sm border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            Run a free public audit
          </Link>
        </div>
      </div>
    </MarketingShell>
  );
}
