import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects";
import { listAudits } from "@/lib/audits";
import { compareProjectRuns } from "@/lib/baseline";
import { AuditForm } from "@/components/audit-form";
import { AuditHistory } from "@/components/audit-history";
import { RunDiff } from "@/components/run-diff";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BoxDivider } from "@/components/forensic/divider";
import { updateProjectAction, deleteProjectAction, upsertProjectScheduleAction } from "../actions";
import { getSessionPlan, planAllowsPersonas } from "@/lib/entitlements";
import { getProjectSchedule, SCAN_INTERVALS } from "@/lib/schedules";
import { FINDING_STATUS_LABELS, FINDING_STATUSES } from "@/lib/finding-workflow";
import { ProAuditUpsell } from "@/components/pro-audit-upsell";
import { SubmitButton } from "@/components/ui/submit-button";
import { DeleteProjectForm } from "../delete-project-form";

export const metadata: Metadata = {
  title: "Project",
};

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const KNOWN_PROJECT_DETAIL_ERRORS = new Set([
    "Give the project a name.",
    "Could not update the project.",
    "Could not delete the project.",
    "Project not found.",
    "Scheduled scans are a Pro feature.",
    "Choose a valid scan interval.",
    "Could not save the scan schedule.",
  ]);
  const errorMessage =
    typeof error === "string" && KNOWN_PROJECT_DETAIL_ERRORS.has(error) ? error : null;

  const supabase = await createClient();
  const project = await getProject(supabase, id);
  if (!project) notFound();

  const audits = await listAudits(supabase, { projectId: project.id });
  const regression = await compareProjectRuns(supabase, audits);
  const auditIds = audits.map((audit) => audit.id);
  const { data: issueRows } = auditIds.length
    ? await supabase
        .from("findings")
        .select("id,test_run_id,status,owner,severity,source")
        .in("test_run_id", auditIds)
        .eq("source", "axe")
    : { data: [] };
  const workflowIssues = issueRows ?? [];
  const latestAuditId = audits[0]?.id ?? null;
  const latestIssues = latestAuditId
    ? workflowIssues.filter((issue) => issue.test_run_id === latestAuditId)
    : [];
  const latestRun = audits[0] ?? null;
  const latestPersonaTotal = latestRun?.task_success_total ?? 0;
  const latestPersonaReached = latestRun?.task_success_achieved ?? 0;
  const latestPersonaBlocked = Math.max(0, latestPersonaTotal - latestPersonaReached);
  const projectStatusCounts = Object.fromEntries(
    FINDING_STATUSES.map((status) => [
      status,
      workflowIssues.filter((issue) => (issue.status ?? "open") === status).length,
    ]),
  ) as Record<(typeof FINDING_STATUSES)[number], number>;
  const latestOpenCount = latestIssues.filter(
    (issue) => !["fixed", "accepted-risk", "false-positive"].includes(issue.status ?? "open"),
  ).length;
  const ownerCounts = [...new Set(workflowIssues.map((issue) => issue.owner?.trim()).filter(Boolean))]
    .sort()
    .map((owner) => ({
      owner,
      count: workflowIssues.filter(
        (issue) => issue.owner === owner && !["fixed", "accepted-risk", "false-positive"].includes(issue.status ?? "open"),
      ).length,
    }))
    .filter((row) => row.count > 0);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canRunPersonas = planAllowsPersonas(await getSessionPlan(supabase, user?.id ?? null));
  const schedule = canRunPersonas ? await getProjectSchedule(supabase, project.id) : null;
  const scheduleRunnerConfigured = Boolean(process.env.CRON_SECRET);

  const updateWithId = updateProjectAction.bind(null, project.id);
  const deleteWithId = deleteProjectAction.bind(null, project.id);
  const saveScheduleWithId = upsertProjectScheduleAction.bind(null, project.id);

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted-foreground">
            <Link href="/projects" className="hover:text-foreground">
              projects
            </Link>
            <span className="mx-1.5 select-none">/</span>
            {project.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{project.name}</h1>
          <p className="mt-1 truncate font-mono text-sm text-muted-foreground">
            {project.url}
          </p>
          {project.description && (
            <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>
        <DeleteProjectForm action={deleteWithId} projectName={project.name} />
      </div>

      <BoxDivider label="new scan for this project" className="my-5" />

      {canRunPersonas ? (
        <AuditForm projectId={project.id} defaultUrl={project.url} submitLabel="Run audit" />
      ) : (
        <ProAuditUpsell />
      )}

      <BoxDivider label="issue work" className="my-5" />

      <div className="space-y-4 rounded-md border border-border p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_0.8fr]">
          <div className="grid gap-2 sm:grid-cols-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">latest open</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{latestOpenCount}</p>
            </div>
            {FINDING_STATUSES.slice(1, 4).map((status) => (
              <div key={status}>
                <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {FINDING_STATUS_LABELS[status]}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{projectStatusCounts[status]}</p>
              </div>
            ))}
          </div>
          <div className="rounded-md border border-border bg-background/60 p-3">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">persona outcome</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {latestPersonaReached} / {latestPersonaTotal}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {latestPersonaTotal > 0
                ? `${latestPersonaBlocked} blocked on latest run`
                : "Run a persona audit to create the client story."}
            </p>
          </div>
        </div>
        {ownerCounts.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {ownerCounts.map((row) => (
              <span
                key={row.owner}
                className="rounded-sm border border-border px-2 py-1 font-mono text-xs text-muted-foreground"
              >
                {row.owner}: {row.count} open
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Assign owners on audit findings to turn this into a client-ready fix queue.
          </p>
        )}
      </div>

      <BoxDivider label="scan schedule" className="my-5" />

      {canRunPersonas ? (
        <form action={saveScheduleWithId} className="space-y-3 rounded-md border border-border p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label
                htmlFor="interval"
                className="font-mono text-xs uppercase tracking-wide text-muted-foreground"
              >
                Frequency
              </Label>
              <select
                id="interval"
                name="interval"
                defaultValue={schedule?.interval ?? "weekly"}
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                {SCAN_INTERVALS.map((interval) => (
                  <option key={interval} value={interval}>
                    {interval === "weekly" ? "Weekly" : "Monthly"}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm">
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={schedule?.enabled ?? true}
                className="size-4 rounded border-border"
              />
              Enabled
            </label>
          </div>
          <div className="grid gap-2 font-mono text-xs text-muted-foreground sm:grid-cols-2">
            <p>
              next run: {schedule ? new Date(schedule.next_run_at).toLocaleString() : "after save"}
            </p>
            <p>
              last run: {schedule?.last_run_at ? new Date(schedule.last_run_at).toLocaleString() : "not yet"}
            </p>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            runner: {scheduleRunnerConfigured ? "configured" : "needs CRON_SECRET + scheduled POST"}
          </p>
          <SubmitButton variant="outline" size="sm">Save schedule</SubmitButton>
        </form>
      ) : (
        <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
          Scheduled persona scans are included with Pro projects.
        </div>
      )}

      {regression ? (
        <>
          <BoxDivider label="since last run" className="my-5" />
          <RunDiff diff={regression} />
        </>
      ) : null}

      <BoxDivider label="saved runs" className="my-5" />

      <AuditHistory audits={audits} />

      <BoxDivider label="edit project" className="my-5" />

      <form action={updateWithId} className="space-y-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="name"
            className="font-mono text-xs uppercase tracking-wide text-muted-foreground"
          >
            Name
          </Label>
          <Input
            id="name"
            name="name"
            defaultValue={project.name}
            required
            maxLength={200}
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="description"
            className="font-mono text-xs uppercase tracking-wide text-muted-foreground"
          >
            Description <span className="normal-case text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="description"
            name="description"
            defaultValue={project.description ?? ""}
            maxLength={500}
          />
        </div>
        {errorMessage && (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}
        <SubmitButton variant="outline" size="sm">Save changes</SubmitButton>
      </form>
    </div>
  );
}
