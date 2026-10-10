import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { ContentArticle } from "@/components/dossier/content-article";

export const metadata: Metadata = {
  alternates: { canonical: "/method" },
  title: "How Personaudit tests",
  description:
    "How Personaudit tests, what each experiment measured (including the null and negative results), and what it does not claim.",
};

// axe-core 4.13.0 is the version resolved in pnpm-lock.yaml for this workspace
// (transitive via @axe-core/playwright). Same constant as sample-report/page.tsx; keep
// both in sync with the lockfile if the engine's axe-core dependency moves.
const AXE_VERSION = "4.13.0";

const EXPERIMENTS_URL = "https://github.com/forbiddenlink/multipersonas/tree/main/experiments";

function ExperimentLink({ name }: { name: string }) {
  return (
    <a
      href={`${EXPERIMENTS_URL}/${name}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-link"
    >
      experiments/{name}
    </a>
  );
}

export default function MethodPage() {
  return (
    <MarketingShell narrow={false}>
      <ContentArticle
        eyebrow="Method"
        title="How Personaudit tests, and what it does not claim"
        mark="what it does not claim"
        lastReviewed="10 October 2026"
        toc={[
          { id: "engine", label: "The scan engine" },
          { id: "experiments", label: "What we measured" },
          { id: "personas", label: "What personas do" },
          { id: "coverage", label: "What automation cannot see" },
        ]}
      >
        <p>
          This page states how a Personaudit result is produced, what our own experiments
          found, and where they found nothing. The experiments are public, with their
          pre-registered thresholds, so you can read the raw write-ups.
        </p>

        <h2 id="engine">The scan engine</h2>
        <p>
          Accessibility findings come from axe-core {AXE_VERSION}, run through Playwright. The
          scan makes no model calls, so the same page state produces the same findings every
          time.
        </p>
        <p>
          Each state the crawl reaches is checked against these axe tags: <code>wcag2a</code>,{" "}
          <code>wcag2aa</code>, <code>wcag21a</code>, <code>wcag21aa</code>,{" "}
          <code>wcag22a</code>, <code>wcag22aa</code>, and <code>best-practice</code>.
        </p>
        <p>
          A defect is identified by its axe rule plus a normalized element selector. The
          normalization collapses ids that a framework generates on every render, so one broken
          component reads as one defect across every state, not one per page.
        </p>
        <p>
          Scanning behind a login runs in the CLI on your machine, using a session you save
          yourself. The hosted service does not scan behind a login.
        </p>

        <h2 id="experiments">What we measured</h2>
        <p>
          Three experiments shaped what Personaudit claims. Each wrote its metric and kill
          criterion down before the data existed. One of them killed a claim we had planned to make.
        </p>

        <h3 id="exp-net-new">Do deep states hold violations a page scan misses?</h3>
        <p>
          Source: <ExperimentLink name="net-new-violations" />. Runs on 15 and 16 July 2026,
          against vendor demo apps and a local Metabase fixture, not production sites.
        </p>
        <ul>
          <li>
            On Sauce Demo, a scan of the entry page found 0 blocking violations. Behind the login
            there were 3 critical ones.
          </li>
          <li>
            On the-internet, deep states added 5 net-new findings to 44 already on the entry
            page. That run missed the threshold set in advance.
          </li>
          <li>
            In the four-target run, the entry-page verdict was wrong on 1 of 4 targets. On
            applitools-demo, deep states hid nothing (0 net-new findings).
          </li>
          <li>
            On the signed-in Metabase fixture, 66 of 85 affected elements (78%) appeared only
            in states deeper than the entry page.
          </li>
        </ul>
        <p>
          The write-up says its own metric changed between runs, that there are only a few
          targets, and that one OrangeHRM comparison is a post-hoc observation, not a
          pre-registered result. It also says this measures reach, not WCAG coverage, and that
          a scripted crawler with a saved session would have reached the same states.
        </p>

        <h3 id="exp-crawler">Do personas find accessibility defects a crawler misses?</h3>
        <p>
          Source: <ExperimentLink name="personas-vs-crawler" />. One target, a Metabase
          fixture, run on 16 July 2026. <strong>No.</strong> The pre-registered metric came out
          at 13.7%, below the 15% line that marks the claim as dead.
        </p>
        <ul>
          <li>The crawler reached 40 states and the personas reached 9.</li>
          <li>The crawler found 264 defects and the personas found 92.</li>
          <li>The two shared 50. The crawler alone found 214, the personas alone found 42.</li>
          <li>The crawler used no model calls. The personas used about 90.</li>
        </ul>
        <p>
          The defect key in that run was flawed: framework-generated selectors made the same
          element look like two defects. The write-up records the flaw instead of rescoring, and
          a sensitivity check that normalized the ids moved the figure to 11.0%, which does not
          change the verdict. The only thing personas reached that the crawler structurally
          could not was content inside opened menus: 3 defects out of a union of 109.
        </p>
        <p>
          So Personaudit does not claim that personas find accessibility defects. The
          deterministic scan does that.
        </p>

        <h3 id="exp-task-success">Can you trust a persona&apos;s task-success verdict?</h3>
        <p>
          Source: <ExperimentLink name="task-success-validity" />. Two targets, 10 goals each
          (5 reachable, 5 impossible), every goal run once, on 16 July 2026.
        </p>
        <ul>
          <li>
            Metabase: 9 of 10 verdicts matched the known answer. None of the 5 impossible goals
            was reported as achieved.
          </li>
          <li>
            Sauce Demo: 9 of 10 matched, again with none of the 5 impossible goals reported as
            achieved.
          </li>
          <li>
            Each run had one false &quot;blocked&quot; on a goal that was reachable: a dashboard
            the persona could not find, and a native select control it could not operate within
            its step budget.
          </li>
        </ul>
        <p>
          That is the error profile: when a persona reports &quot;blocked&quot;, the site may
          be blocking the goal or the persona may have failed to find a way. The write-up calls
          the result enough to build on, not a launch claim, because the sample is small and
          single-run.
        </p>

        <h2 id="personas">What personas do</h2>
        <p>
          Personas browse toward a goal and report two things: whether the goal was achieved,
          and an opinion about the experience. They do not issue an accessibility verdict and
          they never simulate a disabled user. A test in the repository fails the build if a
          persona profile claims a disability or is asked to judge WCAG conformance.
        </p>
        <p>
          Traversal personas are told they are an automated harness, not a person. For testing
          with disabled people, see the{" "}
          <Link href="/accessibility" className="text-link">
            accessibility statement
          </Link>
          .
        </p>

        <h2 id="coverage">What automation cannot see</h2>
        <p>
          Automated checks, ours included, catch only part of the failures WCAG describes. A
          clean scan means axe found no violations in the states it reached. It does not mean
          the site works for everyone. You still need manual keyboard testing and review with a
          screen reader.
        </p>
        <p>
          For how we check this site against the same engine, see the{" "}
          <Link href="/accessibility" className="text-link">
            accessibility statement
          </Link>
          . For how we handle your data, see the{" "}
          <Link href="/security" className="text-link">
            security page
          </Link>
          . For what a finished report looks like, see the{" "}
          <Link href="/sample-report" className="text-link">
            sample report
          </Link>
          .
        </p>
      </ContentArticle>
    </MarketingShell>
  );
}
