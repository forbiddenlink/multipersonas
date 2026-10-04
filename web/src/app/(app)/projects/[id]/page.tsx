import { parseTaskDefinition } from "@engine/tasks/definition";
import { TaskEvidencePanel } from "@/components/task-evidence";
import { taskComparison, TASK_INPUT_ERROR, TASK_ORIGIN_ERROR } from "@/lib/tasks";
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
import { FindingsTrend } from "@/components/findings-trend";
import { buildFindingsTrend } from "@/lib/findings-trend";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BoxDivider } from "@/components/forensic/divider";
import { saveProjectTaskAction, updateProjectAction, deleteProjectAction, upsertProjectScheduleAction } from "../actions";
import { getSessionPlan, planAllowsPersonas } from "@/lib/entitlements";
import { getProjectSchedule, SCAN_INTERVALS } from "@/lib/schedules";
import { FINDING_STATUS_LABELS, FINDING_STATUSES } from "@/lib/finding-workflow";
import { SubmitButton } from "@/components/ui/submit-button";
import { DeleteProjectForm } from "../delete-project-form";
import { ExhibitHead } from "@/components/dossier/exhibit-head";

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
    TASK_INPUT_ERROR,
    TASK_ORIGIN_ERROR,
    "Could not save the task.",
    "Give the project a name.",
    "Could not update the project.",
    "Could not delete the project.",
    "Project not found.",
    "Scheduled scans come with the Solo and Agency plans.",
    "Choose a valid scan interval.",
    "Could not save the scan schedule.",
  ]);
  const errorMessage =
    typeof error === "string" && KNOWN_PROJECT_DETAIL_ERRORS.has(error) ? error : null;

  const supabase = await createClient();
  const project = await getProject(supabase, id);
  if (!project) notFound();

  const savedTask = parseTaskDefinition(project.task_definition);
  const saveTask = saveProjectTaskAction.bind(null, project.id);
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
  const findingsTrend = buildFindingsTrend(audits, workflowIssues);
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
    <div className="max-w-6xl">
      <ExhibitHead label="Client file" className="mb-5" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted-foreground">
            <Link href="/projects" className="hover:text-foreground">
              projects
            </Link>
            <span className="mx-1.5 select-none">/</span>
            {project.name}
          </p>
          <h1 className="display mt-1 text-2xl leading-tight text-foreground">{project.name}</h1>
          <p className="mt-1 truncate font-mono text-sm text-muted-foreground">
            {project.url}
          </p>
          {project.description && (
            <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>
        <DeleteProjectForm action={deleteWithId} projectName={project.name} />
      </div>

      {errorMessage && (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}

      <div className="mt-2 grid gap-x-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:items-start">
        <div className="min-w-0">
      <BoxDivider label="new scan for this project" className="my-5" />

      {canRunPersonas ? (
        <AuditForm key={`${user?.id}:${JSON.stringify(savedTask)}`} userId={user?.id} projectId={project.id} defaultUrl={project.url} submitLabel={savedTask ? "Test saved task" : "Run audit"} />
      ) : (
        <div>
          <p className="text-sm text-muted-foreground">
            Persona task-success runs come with the Solo and Agency plans. The free grade of a public page needs no plan.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href="/grade"
              className="inline-flex h-10 items-center rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[inset_0_-2px_0_oklch(0_0_0/0.18)] transition-colors duration-150 hover:bg-[color-mix(in_oklch,var(--primary)_86%,black)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Run a free grade
            </Link>
            <Link href="/for-agencies#early-access" className="text-link text-sm">
              See founding access
            </Link>
          </div>
        </div>
      )}

      {latestRun?.task_definition ? (
        <div className="mt-5 space-y-3">
          <TaskEvidencePanel task={latestRun.task_definition} outcomes={latestRun.task_outcomes} runId={latestRun.id} />
          <p className="text-sm text-muted-foreground">{taskComparison(latestRun, audits[1])}</p>
          <Link href={`/audits/${latestRun.id}`} className="text-sm underline underline-offset-4">Open latest task run</Link>
        </div>
      ) : null}

      <BoxDivider label="issue work" className="my-5" />

      <div className="sheet space-y-4 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_0.8fr]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="label-mono">Open now</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{latestOpenCount}</p>
            </div>
            {FINDING_STATUSES.slice(1, 4).map((status) => (
              <div key={status}>
                <p className="label-mono">
                  {FINDING_STATUS_LABELS[status]}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{projectStatusCounts[status]}</p>
              </div>
            ))}
          </div>
          <div className="rounded-sm border border-border bg-background/60 p-3">
            <p className="label-mono">Persona outcome</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {latestPersonaReached} / {latestPersonaTotal}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {latestPersonaTotal > 0
                ? latestRun?.task_definition ? `${latestPersonaBlocked} without verified text on latest run` : `${latestPersonaBlocked} blocked on latest run`
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

      {regression ? (
        <>
          <BoxDivider label="since last run" className="my-5" />
          <RunDiff diff={regression} />
        </>
      ) : null}

      {findingsTrend.length >= 2 ? (
        <>
          <BoxDivider label="findings over time" className="my-5" />
          <p className="mb-3 text-sm text-muted-foreground">
            Axe findings detected in each of your last {findingsTrend.length} runs, oldest first.
          </p>
          <FindingsTrend rows={findingsTrend} />
        </>
      ) : null}

      <BoxDivider label="saved runs" className="my-5" />

      <AuditHistory audits={audits} />

        </div>
        <div className="min-w-0">
      <BoxDivider label="task to test" className="my-5" />
      <form action={saveTask} className="sheet space-y-3 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="task-goal">What should a visitor accomplish?</Label>
          <textarea id="task-goal" name="goal" defaultValue={savedTask?.goal ?? ""} minLength={10} maxLength={1000}
            placeholder="Find the service that fits a small business and reach the quote request form."
            className="min-h-24 w-full rounded-sm border border-input bg-background p-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="task-success-text">Exact visible text expected on the final page</Label>
          <Input id="task-success-text" name="successText" defaultValue={savedTask?.successText ?? ""} minLength={3} maxLength={240}
            placeholder="Request a quote" aria-describedby="task-help" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="task-expected-url">Expected final URL (optional)</Label>
          <Input id="task-expected-url" name="expectedUrl" type="url" maxLength={2048}
            defaultValue={savedTask?.version === 2 ? savedTask.expectedUrl ?? "" : ""}
            placeholder="https://example.com/contact" aria-describedby="task-url-help" />
          <p id="task-url-help" className="text-xs text-muted-foreground">
            Use the same protocol, hostname, and port as the project URL. Require this exact destination, including its path, query, and fragment. Leave blank to check text on any reached page.
          </p>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="requireNewText" className="mt-1"
            defaultChecked={savedTask?.version === 2 && savedTask.requireNewText} />
          <span>Require the expected text to be absent at the start and visible at the end</span>
        </label>
        <p id="task-help" className="text-xs text-muted-foreground">
          Choose distinctive confirmation text. Use the additional checks to reject an old confirmation or the wrong destination. These observations do not prove that a transaction completed. Save before running.
          Existing safeguards still prevent purchases and destructive actions. Do not include passwords or personal data.
          Clear the text and URL fields and uncheck the additional check to return to the built-in goals. Past results keep the task they tested.
        </p>
        <SubmitButton variant="outline" size="sm">Save task</SubmitButton>
      </form>

      <BoxDivider label="scan schedule" className="my-5" />

      {canRunPersonas ? (
        <form action={saveScheduleWithId} className="sheet space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="interval" className="label-mono">
                Frequency
              </Label>
              <select
                id="interval"
                name="interval"
                defaultValue={schedule?.interval ?? "weekly"}
                className="h-9 w-full rounded-sm border border-input bg-background px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                {SCAN_INTERVALS.map((interval) => (
                  <option key={interval} value={interval}>
                    {interval === "weekly" ? "Weekly" : "Monthly"}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex h-9 items-center gap-2 rounded-sm border border-border px-3 text-sm">
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={schedule?.enabled ?? true}
                className="size-4 rounded-sm border-border"
              />
              Enabled
            </label>
          </div>
          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <p>
              Next run: {schedule ? new Date(schedule.next_run_at).toLocaleString() : "after save"}
            </p>
            <p>
              Last run: {schedule?.last_run_at ? new Date(schedule.last_run_at).toLocaleString() : "not yet"}
            </p>
          </div>
          {!scheduleRunnerConfigured ? (
            <p className="text-xs text-muted-foreground">
              Scheduled scans are not running on this deployment yet. Your schedule is saved and
              starts once scheduling is switched on.
            </p>
          ) : null}
          <SubmitButton variant="outline" size="sm">Save schedule</SubmitButton>
        </form>
      ) : (
        <div className="sheet p-4 text-sm text-muted-foreground">
          Scheduled persona scans come with the Solo and Agency plans.
        </div>
      )}

        </div>
      </div>

      <div className="max-w-xl">
      <BoxDivider label="edit project" className="my-5" />

      <form action={updateWithId} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="label-mono">
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
          <Label htmlFor="description" className="label-mono">
            Description <span className="normal-case tracking-normal">(optional)</span>
          </Label>
          <Input
            id="description"
            name="description"
            defaultValue={project.description ?? ""}
            maxLength={500}
          />
        </div>

        <SubmitButton variant="outline" size="sm">Save changes</SubmitButton>
      </form>
      </div>
    </div>
  );
}
