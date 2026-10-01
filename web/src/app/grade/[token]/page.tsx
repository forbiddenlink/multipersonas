import type { Metadata } from "next";
import Link from "next/link";
import { GradeCoverage } from "@/components/grade-coverage";
import { GradeNextSteps } from "@/components/grade-next-steps";
import { ClaimGrades } from "@/components/claim-grades";
import { SiteFooter } from "@/components/site-footer";
import { notFound } from "next/navigation";
import { getGraderScan } from "@/lib/grade";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { GradePoll } from "@/components/grade-poll";
import { GradeBadgeEmbed } from "@/components/grade-badge-embed";
import { GradeVerdictStamp } from "@/components/dossier/grade-verdict-stamp";
import { GradeFindingRow } from "@/components/dossier/grade-finding-row";
import { GradeCopyLink } from "@/components/dossier/grade-copy-link";
import { EmptyPrompt } from "@/components/forensic/empty-prompt";
import { createClient } from "@/lib/supabase/server";
import type { GradeReport } from "@engine/grader/score";

// Rules arrive sorted by weight, so the first few critical or serious ones are where to start.
const FIX_FIRST_COUNT = 3;

// Dynamic per-scan metadata so a shared grade link previews the real domain + grade in
// Slack/iMessage/Twitter. Always noindex: the URL is an unguessable capability token, not
// an indexable page — letting search engines crawl it would both leak the graded result
// and pollute the index with token URLs. Social previews don't require indexing.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const scan = await getGraderScan(token);
  const base: Metadata = { robots: { index: false, follow: false } };

  if (!scan) return { ...base, title: "Case file not found" };

  let host = scan.entry_url;
  try {
    host = new URL(scan.entry_url).host;
  } catch {
    /* keep raw entry_url */
  }

  if (scan.status !== "completed" || !scan.report) {
    return {
      ...base,
      title: `Grading ${host}…`,
      description: `Accessibility grade in progress for ${host}.`,
    };
  }

  const grade = (scan.report as unknown as GradeReport).grade;
  return {
    ...base,
    title: `${host} scored ${grade} on accessibility`,
    description: `Personaudit graded ${host} a ${grade} using real axe-core violation weights. A free, honest letter grade on any public page.`,
  };
}

export default async function GradeResultPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const [scan, { data: auth }] = await Promise.all([
    getGraderScan(token),
    supabase.auth.getUser(),
  ]);

  if (!scan) notFound();
  const signedIn = Boolean(auth.user);

  const host = (() => {
    try {
      return new URL(scan.entry_url).host;
    } catch {
      return scan.entry_url;
    }
  })();

  return (
    <div className="grade-print-root flex min-h-dvh flex-col pb-[env(safe-area-inset-bottom)]">
      <SiteHeader intent="grade" />

      <main id="main" className="flex-1">
        <div className="frame-narrow py-14 sm:py-20">
          <p className="grade-print-meta font-mono text-sm">
            Graded {scan.entry_url} on {gradedOn(scan.created_at)}
          </p>
          <div className="file-tab">
            <span>Case file</span>
            <span className="text-foreground/40">·</span>
            <span className="max-w-[16rem] truncate">{host}</span>
          </div>

          <article className="sheet relative -mt-px p-6 sm:p-8">
            {(scan.status === "queued" || scan.status === "running") && (
              // Soft-refreshes in place (router.refresh) instead of a <meta refresh>
              // full-page reload, which reset reading position every 5s (WCAG 2.2.1 F5).
              <GradePoll token={token} />
            )}

            {scan.status === "failed" && (
              <div className="border-t-2 border-dashed border-[var(--redline)] pt-5">
                <p className="redline-note uppercase tracking-[0.1em]">Grade failed</p>
                <p className="mt-2 leading-relaxed text-muted-foreground">
                  {scan.error || "Something went wrong while scanning this URL."}
                </p>
                <Link href="/grade" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-5" })}>
                  Try another URL
                </Link>
              </div>
            )}

            {scan.status === "completed" && scan.report && (
              <GradeReportView
                token={token}
                host={host}
                signedIn={signedIn}
                entryUrl={scan.entry_url}
                report={scan.report as unknown as GradeReport}
              />
            )}
          </article>
        </div>
      </main>
      <SiteFooter />
      {signedIn ? <ClaimGrades /> : null}
    </div>
  );
}

// UTC calendar date, so the printed line does not depend on the server's timezone.
function gradedOn(createdAt: string): string {
  const d = new Date(createdAt);
  return Number.isNaN(d.getTime()) ? "an unknown date" : d.toISOString().slice(0, 10);
}

function GradeReportView({
  token,
  host,
  signedIn,
  entryUrl,
  report,
}: {
  token: string;
  host: string;
  signedIn: boolean;
  entryUrl: string;
  report: GradeReport;
}) {
  return (
    <div className="space-y-8">
      {/* The verdict: letter grade as the stamp, score as the fraction beside it. */}
      <header className="flex flex-wrap items-center gap-6 border-b-2 border-foreground pb-6">
        <GradeVerdictStamp grade={report.grade} score={report.score} />
        <div className="min-w-0">
          <p className="label-mono">Accessibility evidence · WCAG 2.2 AA</p>
          <p className="mt-1.5 font-mono text-sm text-muted-foreground">
            {report.totalViolations} violation{report.totalViolations === 1 ? "" : "s"} across{" "}
            {report.pagesScanned} page{report.pagesScanned === 1 ? "" : "s"}
          </p>
        </div>
        <div className="grade-print-hide ml-auto shrink-0">
          <GradeCopyLink token={token} />
        </div>
      </header>

      {/* Named rules — the traceable table behind the composite. Older stored reports
          may omit this (pre-rules field); skip gracefully. */}
      {report.rules && report.rules.length > 0 ? (
        <section>
          <p className="label-mono">Findings</p>
          <ul className="mt-4 border-t border-border">
            {report.rules.map((rule, i) => (
              <GradeFindingRow
                key={rule.id}
                fixFirst={i < FIX_FIRST_COUNT && (rule.impact === "critical" || rule.impact === "serious")}
                ruleId={rule.id}
                severity={rule.impact}
                help={rule.help}
                nodes={rule.nodes}
                wcagAA={rule.wcagAA}
              />
            ))}
          </ul>
          {report.totalViolations > report.wcagAAViolations ? (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {report.wcagAAViolations} of these are tagged WCAG 2.x A/AA. The rest are axe
              best-practice rules: real defects, but not success criteria.
            </p>
          ) : null}
        </section>
      ) : (
        <EmptyPrompt prompt="No violations on the pages we reached." hint="Zero findings from axe-core across every evaluated public page." />
      )}

      {/* Per-page list */}
      {(report.perPage?.length ?? 0) > 0 && (
        <section>
          <p className="label-mono">Pages scanned</p>
          <div className="mt-4 divide-y divide-border border-t border-border font-mono text-sm">
            {report.perPage.map((p) => (
              <div key={p.url} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1 truncate">{p.url}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {p.violations} violation{p.violations === 1 ? "" : "s"}
                </span>
                <span className="shrink-0 tabular-nums">{p.score}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* The honesty note — what this grade does NOT cover. */}
      <GradeCoverage report={report} />

      {/* Embed badge + share link */}
      <div className="grade-print-hide">
        <GradeBadgeEmbed token={token} host={host} />
      </div>

      {/* Next steps + the actual conversion ask. Never a compliance claim. */}
      <div className="grade-print-hide">
        <GradeNextSteps
          signedIn={signedIn}
          pagesScanned={report.pagesScanned}
          entryUrl={entryUrl}
        />
      </div>
    </div>
  );
}
