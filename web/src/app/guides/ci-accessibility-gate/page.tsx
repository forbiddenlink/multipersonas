import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { JsonLd, articleSchema } from "@/components/json-ld";
import { ContentArticle } from "@/components/dossier/content-article";
import { ContentCodeBlock } from "@/components/dossier/content-code-block";
import { ContentCallout } from "@/components/dossier/content-callout";

export const metadata: Metadata = {
  alternates: { canonical: "/guides/ci-accessibility-gate" },
  title: "CI accessibility gate",
  description:
    "Fail the build only on new axe-core defects. Baseline today's backlog, then gate PRs on regressions: deterministic, keyless, and it works behind a saved session.",
};

export default function CiGateGuidePage() {
  return (
    <MarketingShell narrow={false}>
      <JsonLd
        data={articleSchema({
          headline: "CI accessibility gate",
          description:
            "Fail the build only on new axe-core defects. Baseline today's backlog, then gate PRs on regressions: deterministic, keyless, and it works behind a saved session.",
          path: "/guides/ci-accessibility-gate",
          datePublished: "2026-08-03",
          dateModified: "2026-09-26",
        })}
      />
      <ContentArticle
        tryIt
        eyebrow="Field guide · CI"
        title="Fail the build only on new defects"
        mark="new defects"
        dek="Snapshot today's backlog once. After that every pull request fails only when axe-core finds a new critical or serious violation, including states behind a saved login session. Deterministic, no API key, and the existing backlog stays ignored until you clear it."
        lastReviewed="26 September 2026"
        toc={[
          { id: "how-it-works", label: "How it works" },
          { id: "cli", label: "CLI" },
          { id: "github-action", label: "GitHub Action" },
          { id: "honesty", label: "What the gate is (and isn't)" },
        ]}
      >
        <h2 id="how-it-works">How it works</h2>
        <ol>
          <li>
            <span className="font-sans font-medium not-italic text-foreground">Capture a session (optional).</span>{" "}
            For a behind-login site, authenticate once locally and save the session. Cookies
            never need to live in the repo: store them as a CI secret.
          </li>
          <li>
            <span className="font-sans font-medium not-italic text-foreground">Write a baseline.</span>{" "}
            Run <code>scan</code> with <code>--update-baseline</code> against staging or
            production. Commit the resulting JSON: that freezes today&apos;s backlog.
          </li>
          <li>
            <span className="font-sans font-medium not-italic text-foreground">Gate PRs on regressions.</span>{" "}
            CI runs <code>scan</code> with <code>--fail-on serious</code>. The build fails only
            when a new defect appears at or above that severity.
          </li>
        </ol>

        <h2 id="cli">CLI</h2>
        <ContentCodeBlock
          label="once, authenticate and save a session"
          code={"npx personaudit auth https://app.example.com --save ./session.json"}
        />
        <ContentCodeBlock
          label="once, snapshot today's defects"
          code={
            "npx personaudit scan https://app.example.com --session ./session.json \\\n  --baseline personaudit-baseline.json --update-baseline"
          }
        />
        <ContentCodeBlock
          label="in ci, fail only on new defects at or above serious"
          code={
            "npx personaudit scan https://app.example.com --session ./session.json \\\n  --baseline personaudit-baseline.json --fail-on serious"
          }
        />

        <h2 id="github-action">GitHub Action</h2>
        <p>
          A ready-to-use workflow lives in the repo at{" "}
          <a
            href="https://github.com/forbiddenlink/multipersonas/blob/main/examples/github-actions/accessibility-gate.yml"
            className="text-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            examples/github-actions/accessibility-gate.yml
          </a>
          . It restores an optional session secret, scans{" "}
          <code>vars.MPERSONAS_TARGET_URL</code>, gates on new critical/serious defects, and
          uploads the Markdown report as a build artifact.
        </p>
        <ContentCodeBlock
          label="examples/github-actions/accessibility-gate.yml"
          code={`name: Accessibility gate
on: pull_request

jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install -g personaudit
      - run: npx playwright install --with-deps chromium

      # Session is optional: omit for a public site.
      - name: Restore session
        if: \${{ secrets.MPERSONAS_SESSION != '' }}
        run: printf '%s' "$MPERSONAS_SESSION" > session.json && chmod 600 session.json
        env:
          MPERSONAS_SESSION: \${{ secrets.MPERSONAS_SESSION }}

      - name: Scan and gate on new critical/serious defects
        run: |
          personaudit scan "\${{ vars.MPERSONAS_TARGET_URL }}" \\
            \${{ secrets.MPERSONAS_SESSION != '' && '--session session.json' || '' }} \\
            --baseline personaudit-baseline.json \\
            --fail-on serious

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: accessibility-report
          path: personaudit-report/scan.md`}
        />

        <h2 id="honesty">What the gate is (and isn&apos;t)</h2>
        <ContentCallout>
          The gate runs on <strong>axe-core</strong> only: deterministic verdicts. Persona
          notes measure task success in the product loop; they never enter the CI baseline and
          never fail the build. Passing this gate does not replace testing with disabled
          people.
        </ContentCallout>

        <h2 className="sr-only">Related</h2>
        <ul>
          <li>
            <Link href="/docs" className="text-link">
              Full CLI docs
            </Link>
            : install, auth, and every flag this guide uses.
          </li>
          <li>
            <Link href="/guides/wcag-checklist" className="text-link">
              WCAG 2.2 AA checklist
            </Link>
            : what the rules the gate cites actually require.
          </li>
        </ul>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/for-agencies#early-access"
            className="inline-flex h-11 items-center justify-center rounded-sm bg-primary px-6 text-[0.9375rem] font-medium text-primary-foreground shadow-[inset_0_-2px_0_oklch(0_0_0/0.18)] transition-colors duration-150 hover:bg-[color-mix(in_oklch,var(--primary)_86%,black)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] no-underline"
          >
            See agency plans
          </Link>
          <Link
            href="/grade"
            className="inline-flex h-11 items-center justify-center rounded-sm border border-border px-6 text-[0.9375rem] font-medium text-muted-foreground transition-colors duration-150 hover:border-foreground/25 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] no-underline"
          >
            Grade a site free
          </Link>
        </div>
      </ContentArticle>
    </MarketingShell>
  );
}
