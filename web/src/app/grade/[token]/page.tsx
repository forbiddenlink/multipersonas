import type { Metadata } from "next";
import Link from "next/link";
import { GradeCoverage, GradeCoverageNote } from "@/components/grade-coverage";
import { GradeFixFirst } from "@/components/grade-fix-first";
import { rankFixFirst } from "@/lib/grade-fix-first";
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
import { GradeShare } from "@/components/grade-share";
import { GradeArrival, GRADE_HEADING_ID } from "@/components/grade-arrival";
import { hostOf, regradePath } from "@/lib/grade-share";
import { displayPath } from "@/lib/format";
import { EmptyPrompt } from "@/components/forensic/empty-prompt";
import { createClient } from "@/lib/supabase/server";
import type { GradeReport } from "@engine/grader/score";

type GradeScanStatus = "queued" | "running" | "completed" | "failed";

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
    description: `Personaudit graded ${host} a ${grade} on its WCAG A/AA axe-core findings. A free, honest letter grade on any public page.`,
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

  const host = hostOf(scan.entry_url);
  const completedReport =
    scan.status === "completed" && scan.report ? (scan.report as unknown as GradeReport) : null;

  return (
    <div className="grade-print-root flex min-h-dvh flex-col pb-[env(safe-area-inset-bottom)]">
      <SiteHeader intent="grade" />

      <main id="main" className="flex-1">
        <div className="frame py-14 sm:py-20">
          <div className="mx-auto max-w-4xl">
            <p className="grade-print-meta font-mono text-sm">
              Graded {scan.entry_url} on {gradedOn(scan.created_at)}
            </p>
            <div className="file-tab">
              <span>Case file</span>
              <span className="text-foreground/40">·</span>
              <span className="max-w-[16rem] truncate">{host}</span>
            </div>

            <article className="sheet relative -mt-px p-6 sm:p-8 lg:p-10">
              {/* One h1 for every state. Focus moves here when a polled grade finishes. */}
              <h1
                id={GRADE_HEADING_ID}
                tabIndex={-1}
                className="display break-words text-[clamp(1.6rem,3.4vw,2.3rem)] leading-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ring)]"
              >
                {host} <span className="text-muted-foreground">accessibility grade</span>
              </h1>
              <p className="grade-print-hide mt-2 font-mono text-sm text-muted-foreground">
                Graded <time dateTime={scan.created_at}>{gradedOn(scan.created_at)}</time>
                <span aria-hidden="true"> · </span>
                <span className="break-all">{scan.entry_url}</span>
              </p>

              <GradeArrival status={scan.status as GradeScanStatus} host={host} grade={completedReport?.grade} />

              <div className="mt-6">
                {(scan.status === "queued" || scan.status === "running") && (
                  // Soft-refreshes in place (router.refresh) instead of a <meta refresh>
                  // full-page reload, which reset reading position every 5s (WCAG 2.2.1 F5).
                  <GradePoll token={token} status={scan.status} />
                )}

                {scan.status === "failed" && (
                  <div className="border-t-2 border-dashed border-[var(--redline)] pt-5">
                    <h2 className="redline-note uppercase tracking-[0.1em]">Grade failed</h2>
                    <p className="mt-2 leading-relaxed text-muted-foreground">
                      {scan.error || "Something went wrong while scanning this URL."}
                    </p>
                    <Link
                      href={regradePath(scan.entry_url)}
                      className={buttonVariants({ variant: "outline", size: "lg", className: "mt-5" })}
                    >
                      Try this URL again
                    </Link>
                  </div>
                )}

                {completedReport && (
                  <GradeReportView
                    token={token}
                    host={host}
                    signedIn={signedIn}
                    entryUrl={scan.entry_url}
                    report={completedReport}
                  />
                )}
              </div>
            </article>
          </div>
        </div>
      </main>
      <SiteFooter />
      {signedIn ? <ClaimGrades /> : null}
    </div>
  );
}

function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
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
  const fixFirstIds = new Set(rankFixFirst(report.rules).map((i) => i.ruleId));

  return (
    <div className="space-y-8">
      {/* The verdict: letter grade as the stamp, score as the fraction beside it. */}
      <header className="space-y-6 border-y-2 border-foreground py-6">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
          <GradeVerdictStamp grade={report.grade} score={report.score} animate />
          <div className="min-w-0">
            <p className="label-mono">Accessibility evidence · WCAG 2.2 AA</p>
            <p className="mt-1.5 font-mono text-sm text-muted-foreground">
              {plural(report.wcagAAViolations, "WCAG A/AA failure")} ·{" "}
              {plural(report.totalViolations - report.wcagAAViolations, "best-practice issue")} ·{" "}
              {plural(report.pagesScanned, "page")}
            </p>
          </div>
        </div>
        <GradeCoverageNote needsReview={report.needsReview} />
        <div className="grade-print-hide flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <GradeShare token={token} host={host} grade={report.grade} />
          <nav aria-label="After this grade" className="flex flex-wrap gap-x-5">
            <Link href={regradePath(entryUrl)} className="text-link inline-flex min-h-11 items-center text-sm">
              Re-grade this site
            </Link>
            <Link href="/grade" className="text-link inline-flex min-h-11 items-center text-sm">
              Grade another site
            </Link>
          </nav>
        </div>
      </header>

      {/* The short answer to "what do I do first", before the full list. */}
      <GradeFixFirst rules={report.rules} pagesScanned={report.pagesScanned} />

      {/* Named rules — the traceable table behind the composite. Older stored reports
          may omit this (pre-rules field); skip gracefully. */}
      {report.rules && report.rules.length > 0 ? (
        <section>
          <h2 className="label-mono">Findings</h2>
          <ul className="mt-4 border-t border-border">
            {report.rules.map((rule) => (
              <GradeFindingRow
                key={rule.id}
                fixFirst={fixFirstIds.has(rule.id)}
                ruleId={rule.id}
                severity={rule.impact}
                help={rule.help}
                nodes={rule.nodes}
                wcagAA={rule.wcagAA}
                examples={rule.examples}
              />
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Counts are affected elements. {plural(report.wcagAAViolations, "element")} fail
            a rule tagged WCAG 2.x A/AA
            {report.scoring === "wcag-a-aa" ? ", and only those set the grade" : ""}.
            {report.totalViolations > report.wcagAAViolations
              ? " The rest are axe best-practice rules: worth fixing, but not success criteria."
              : ""}
          </p>
        </section>
      ) : (
        <EmptyPrompt prompt="No violations on the pages we reached." hint="Zero findings from axe-core across every evaluated public page." />
      )}

      {/* Next steps + the actual conversion ask. Never a compliance claim. */}
      {/* The checklist prints; the conversion buttons inside it carry grade-print-hide. */}
      <GradeNextSteps
        signedIn={signedIn}
        pagesScanned={report.pagesScanned}
        entryUrl={entryUrl}
      />

      {/* Per-page list */}
      {(report.perPage?.length ?? 0) > 0 && (
        <section>
          <h2 className="label-mono">Pages scanned</h2>
          <div className="mt-4 divide-y divide-border border-t border-border font-mono text-sm">
            {report.perPage.map((p) => (
              <div key={p.url} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1 truncate" title={p.url}>{displayPath(p.url)}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {plural(p.violations, "affected element")}
                </span>
                <span className="shrink-0 tabular-nums">
                  <span className="sr-only">Score </span>
                  {p.score}
                  <span className="text-muted-foreground">/100</span>
                </span>
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
    </div>
  );
}
