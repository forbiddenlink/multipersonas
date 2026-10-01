import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { JsonLd, articleSchema } from "@/components/json-ld";
import { ContentArticle } from "@/components/dossier/content-article";
import { ContentCodeBlock } from "@/components/dossier/content-code-block";
import { ContentCallout } from "@/components/dossier/content-callout";

export const metadata: Metadata = {
  alternates: { canonical: "/docs" },
  title: "CLI docs: install and first scan",
  description:
    "Install the Personaudit CLI, save a login session on your own machine, and run axe-core at every state the site reaches. No API key, no account.",
};

const TOC = [
  { id: "install", label: "Install" },
  { id: "auth", label: "Save a login session" },
  { id: "scan", label: "Run a scan" },
  { id: "ci-gate", label: "Baseline + CI gate" },
  { id: "personas", label: "Personas" },
  { id: "troubleshooting", label: "Troubleshooting" },
] as const;

export default function DocsPage() {
  return (
    <MarketingShell narrow={false}>
      <JsonLd
        data={articleSchema({
          headline: "Personaudit CLI: install and first scan",
          description:
            "Install the CLI, save a session, scan behind a login, and gate CI on new accessibility defects.",
          path: "/docs",
          datePublished: "2026-09-24",
          dateModified: "2026-09-26",
        })}
      />
      <ContentArticle
        eyebrow="Documentation"
        title="Install and run your first scan"
        mark="first scan"
        dek="The CLI is the whole compliance path. It needs no API key and no account: scan drives a real Chromium, crawls every same-origin state it can reach, and runs axe-core at each one."
        lastReviewed="26 September 2026"
        toc={[...TOC]}
      >
        <h2 id="install">Install</h2>
        <p>
          The package is published on npm, so <code>npx</code> runs it with nothing installed
          ahead of time. Node 20 or newer.
        </p>
        <ContentCodeBlock label="run once" code="npx personaudit scan https://example.com" />
        <p>
          The first run also needs a Chromium build for Playwright to drive. Install it once,
          or add the step to CI:
        </p>
        <ContentCodeBlock
          label="one-time browser setup"
          code={"npx playwright install --with-deps chromium"}
        />
        <p>
          Scanning often? Install the CLI globally instead of re-fetching it through{" "}
          <code>npx</code> every time. The package installs two names for the same binary:{" "}
          <code>personaudit</code> and the older <code>mpersonas</code>.
        </p>
        <ContentCodeBlock label="global install" code={"npm i -g personaudit\npersonaudit --help"} />

        <h2 id="auth">Save a login session</h2>
        <p>
          <code>auth</code> opens a real browser and waits while you sign in by hand, however
          the site expects: password, SSO, 2FA, a magic link. Nothing about that flow is
          scripted, and your password never passes through Personaudit.
        </p>
        <ContentCodeBlock
          label="capture a session"
          code={"npx personaudit auth https://app.example.com --save ./session.json"}
        />
        <ContentCallout label="Stays on your machine">
          The saved file holds live cookies and gets written with permissions{" "}
          <code>0600</code> (owner read/write only). It stays on your machine, never
          uploaded, and the hosted product never asks for it. Treat it exactly like a
          password, and store it as a CI secret rather than committing it to the repo.
        </ContentCallout>

        <h2 id="scan">Run a scan</h2>
        <p>
          <code>scan</code> crawls same-origin states from the URL you give it and runs
          axe-core at every one. Pass the saved session to reach the states that only exist
          once you are signed in.
        </p>
        <ContentCodeBlock
          label="scan behind a login"
          code={
            "npx personaudit scan https://app.example.com \\\n  --session ./session.json \\\n  --max-pages 40"
          }
        />
        <dl className="grid gap-x-6 gap-y-5 border-t-2 border-foreground pt-5 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <dt className="min-w-0 font-mono text-[0.8125rem] break-words text-foreground">
            -o, --output &lt;path&gt;
          </dt>
          <dd className="min-w-0 text-[0.9375rem] text-muted-foreground">
            Where the report is written. Defaults to <code>./mpersonas-report</code>.
          </dd>
          <dt className="min-w-0 font-mono text-[0.8125rem] break-words text-foreground">
            --session &lt;file&gt;
          </dt>
          <dd className="min-w-0 text-[0.9375rem] text-muted-foreground">
            The file saved by <code>auth</code>, to scan behind a login.
          </dd>
          <dt className="min-w-0 font-mono text-[0.8125rem] break-words text-foreground">
            --max-pages &lt;n&gt;
          </dt>
          <dd className="min-w-0 text-[0.9375rem] text-muted-foreground">
            How many states to crawl. Defaults to 40.
          </dd>
          <dt className="min-w-0 font-mono text-[0.8125rem] break-words text-foreground">
            --allow-private
          </dt>
          <dd className="min-w-0 text-[0.9375rem] text-muted-foreground">
            Allow a localhost or private-network target. Only pass this for a site you own,
            such as a local dev server or a staging box. The hosted grader always refuses
            these targets.
          </dd>
        </dl>

        <h2 id="ci-gate">Baseline + CI gate</h2>
        <p>
          A real site already has a backlog of known issues. Freeze that backlog once as a
          baseline, then gate every pull request only on defects the branch introduces.
          Existing issues stay ignored until someone clears them.
        </p>
        <ContentCodeBlock
          label="once, commit the baseline"
          code={
            "npx personaudit scan https://app.example.com --session ./session.json \\\n  --baseline mpersonas-baseline.json --update-baseline"
          }
        />
        <ContentCodeBlock
          label="in CI, exit non-zero only on new defects"
          code={
            "npx personaudit scan https://app.example.com --session ./session.json \\\n  --baseline mpersonas-baseline.json --fail-on serious"
          }
        />
        <p>
          <code>--fail-on</code> takes <code>critical</code>, <code>serious</code>,{" "}
          <code>moderate</code>, or <code>minor</code>. The baseline compares by a
          render-stable defect key, so a framework-generated element id (React&apos;s{" "}
          <code>#radix-…</code>, Vue&apos;s auto ids) never reads as a false new regression on
          the next run.
        </p>
        <p>
          A ready-to-paste GitHub Actions workflow lives in the repo at{" "}
          <a
            href="https://github.com/forbiddenlink/multipersonas/blob/main/examples/github-actions/accessibility-gate.yml"
            className="text-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            examples/github-actions/accessibility-gate.yml
          </a>
          . It restores an optional session secret, scans a target URL, gates on new
          critical/serious defects, and uploads the report as a build artifact.
        </p>

        <h2 id="personas">Personas</h2>
        <p>
          <code>run</code> adds LLM personas that browse toward a goal and report whether they
          reached it. It is the one command that needs an API key.
        </p>
        <ContentCodeBlock
          label="persona run"
          code={"export ANTHROPIC_API_KEY=sk-ant-…\nnpx personaudit run https://example.com"}
        />
        <ContentCallout variant="highlight" label="Opinion, not compliance">
          Persona notes are task success plus a written opinion, not an accessibility verdict.
          axe-core findings are the only output that goes into a compliance report, and no
          persona ever claims a disability. That is a permanent product rule, not a current
          limitation.
        </ContentCallout>

        <h2 id="troubleshooting">Troubleshooting</h2>
        <h3>&ldquo;Executable doesn&apos;t exist&rdquo; when a scan starts</h3>
        <p>
          Playwright&apos;s Chromium build is not installed yet. Run{" "}
          <code>npx playwright install --with-deps chromium</code> once, then re-run the scan.
        </p>
        <h3>&ldquo;This URL points to a private network and can&apos;t be tested&rdquo;</h3>
        <p>
          The target resolves to localhost, a private IP range, or link-local metadata. Add{" "}
          <code>--allow-private</code> if it is genuinely your own app or staging box. The
          hosted free grade never accepts this flag, since there the URL comes from a
          stranger.
        </p>
        <h3>The CI gate fails on everything, including old issues</h3>
        <p>
          There is no baseline yet, or <code>--baseline</code> points at the wrong file. Run
          the <code>--update-baseline</code> command once against the same target and commit
          the resulting JSON before turning on <code>--fail-on</code> in CI.
        </p>
        <h3>&ldquo;run&rdquo; exits immediately with a missing API key error</h3>
        <p>
          Only the persona layer needs <code>ANTHROPIC_API_KEY</code>. <code>scan</code> never
          reads it. If you only need the axe-core verdict, drop <code>run</code> entirely.
        </p>

        <h2 className="sr-only">Next</h2>
        <ul>
          <li>
            <Link href="/pricing" className="text-link">
              Pricing
            </Link>
            : what the hosted workspace adds on top of the CLI.
          </li>
          <li>
            <Link href="/guides/ci-accessibility-gate" className="text-link">
              CI accessibility gate guide
            </Link>
            : the same setup, walked through step by step.
          </li>
          <li>
            <Link href="/grade" className="text-link">
              Free grade
            </Link>
            : up to 10 public pages in the browser, no install.
          </li>
        </ul>
      </ContentArticle>
    </MarketingShell>
  );
}
