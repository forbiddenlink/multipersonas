import type { Metadata } from "next";
import Link from "next/link";
import { GradeNextSteps } from "@/components/grade-next-steps";
import { ClaimGrades } from "@/components/claim-grades";
import { SiteFooter } from "@/components/site-footer";
import { notFound } from "next/navigation";
import { getGraderScan } from "@/lib/grade";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { GradePoll } from "@/components/grade-poll";
import { GradeBadgeEmbed } from "@/components/grade-badge-embed";
import { Meter } from "@/components/forensic/meter";
import { SeverityChip } from "@/components/forensic/severity-chip";
import { BoxDivider } from "@/components/forensic/divider";
import { SEVERITY_ORDER } from "@/components/forensic/severity";
import { createClient } from "@/lib/supabase/server";
import type { GradeReport } from "@engine/grader/score";

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

  if (!scan) return { ...base, title: "Accessibility grade result" };

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
    description: `Personaudit graded ${host} a ${grade} using real axe-core violation weights — a free, honest letter grade on any public page.`,
  };
}

// Grade bands map onto the site's existing severity vocabulary rather than inventing a
// new "good/bad" palette — A/B read as the calm teal "live" accent, C/D/F escalate
// through the same moderate/serious/critical tokens the axe findings themselves use.
function gradeTone(grade: GradeReport["grade"]): string {
  if (grade === "A" || grade === "B") return "var(--primary)";
  if (grade === "C") return "var(--severity-moderate)";
  if (grade === "D") return "var(--severity-serious)";
  return "var(--severity-critical)";
}

function meterTone(grade: GradeReport["grade"]): "teal" | "moderate" | "serious" | "critical" {
  if (grade === "A" || grade === "B") return "teal";
  if (grade === "C") return "moderate";
  if (grade === "D") return "serious";
  return "critical";
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
    <div className="flex min-h-dvh flex-col">
      <SiteHeader intent="grade" />

      <main id="main" className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-6 py-16">
          <p className="font-mono text-xs text-muted-foreground">
            <span className="select-none text-[var(--primary)]">›&nbsp;</span>
            grade result for <span className="text-foreground">{host}</span>
          </p>

          {(scan.status === "queued" || scan.status === "running") && (
            // Soft-refreshes in place (router.refresh) instead of a <meta refresh>
            // full-page reload, which reset reading position every 5s (WCAG 2.2.1 F5).
            <GradePoll token={token} />
          )}

          {scan.status === "failed" && (
            <div className="mt-8 rounded-md border border-border bg-card px-4 py-4">
              <p className="font-mono text-sm" style={{ color: "var(--severity-critical)" }}>
                ✗ grade failed
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {scan.error || "Something went wrong while scanning this URL."}
              </p>
              <Link href="/grade" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-4" })}>
                Try another URL
              </Link>
            </div>
          )}

          {scan.status === "completed" && scan.report && (
            <GradeReportView
              token={token}
              host={host}
              signedIn={signedIn}
              report={scan.report as unknown as GradeReport}
            />
          )}
        </div>
      </main>
      <SiteFooter />
      {signedIn ? <ClaimGrades /> : null}
    </div>
  );
}

function GradeReportView({
  token,
  host,
  signedIn,
  report,
}: {
  token: string;
  host: string;
  signedIn: boolean;
  report: GradeReport;
}) {
  return (
    <div className="mt-8 space-y-10">
      {/* Big letter grade + score meter */}
      <div className="flex flex-wrap items-center gap-8 rounded-md border border-border bg-card px-6 py-8">
        <span
          className="font-mono text-7xl font-bold leading-none tabular-nums"
          style={{ color: gradeTone(report.grade) }}
          aria-hidden="true"
        >
          {report.grade}
        </span>
        <div className="flex-1 min-w-[12rem]">
          <p className="sr-only">Grade: {report.grade}</p>
          <Meter
            value={report.score}
            total={100}
            label="score"
            unit={`across ${report.pagesScanned ?? 0} page${(report.pagesScanned ?? 0) === 1 ? "" : "s"}`}
            tone={meterTone(report.grade)}
          />
        </div>
      </div>

      {/* Per-impact breakdown — the traceable table behind the composite. */}
      <div className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          Violations by impact
        </h2>
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <div className="divide-y divide-border">
            {SEVERITY_ORDER.map((severity) => (
              <div key={severity} className="flex items-center justify-between px-4 py-3">
                <SeverityChip severity={severity} />
                <span className="font-mono text-sm tabular-nums text-foreground">
                  {report.byImpact?.[severity] ?? 0}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 font-mono text-xs text-muted-foreground">
            <span>WCAG 2.x A/AA violations</span>
            <span className="tabular-nums text-foreground">{report.wcagAAViolations}</span>
          </div>
          {report.totalViolations > report.wcagAAViolations ? (
            <p className="border-t border-border px-4 py-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
              Impact totals include axe best-practice rules that are not WCAG success
              criteria — that is why the WCAG A/AA count can be lower.
            </p>
          ) : null}
        </div>
      </div>

      {/* Named rules — so the impact table is not a black box. Older stored reports
          may omit this (pre-rules field); skip gracefully. */}
      {report.rules && report.rules.length > 0 ? (
        <div className="space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
            Rules found
          </h2>
          <div className="overflow-hidden rounded-md border border-border bg-card">
            <ul className="divide-y divide-border">
              {report.rules.map((rule) => (
                <li key={rule.id} className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityChip severity={rule.impact} />
                      <span className="font-mono text-xs text-muted-foreground">{rule.id}</span>
                      {!rule.wcagAA ? (
                        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                          best-practice
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-foreground">{rule.help}</p>
                  </div>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {rule.nodes} node{rule.nodes === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {/* Per-page list */}
      {(report.perPage?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
            Pages scanned
          </h2>
          <div className="overflow-hidden rounded-md border border-border bg-card font-mono text-sm">
            <div className="divide-y divide-border">
              {report.perPage.map((p) => (
                <div key={p.url} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-card-foreground">{p.url}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {p.violations} violation{p.violations === 1 ? "" : "s"}
                  </span>
                  <span className="shrink-0 tabular-nums text-foreground">{p.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Embed Badge Widget */}
      <GradeBadgeEmbed token={token} host={host} />

      <BoxDivider />

      {/* Honesty wall + the actual conversion ask. Never a compliance claim. */}
      <GradeNextSteps signedIn={signedIn} pagesScanned={report.pagesScanned} />
    </div>
  );
}
