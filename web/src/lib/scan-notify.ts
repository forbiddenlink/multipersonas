import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { listAudits } from "@/lib/audits";
import { compareProjectRuns } from "@/lib/baseline";
import { buildScanDigest, type ScanDigestInput } from "@/lib/scan-digest";
import type { OutgoingEmail } from "@/lib/email";

type SB = SupabaseClient<Database>;

/** A schedule whose latest job has not been emailed yet. */
export interface ScheduleCandidate {
  id: string;
  projectId: string;
  userId: string;
  lastJobId: string;
  lastNotifiedJobId: string | null;
}

export interface RunSummary {
  regression: NonNullable<ScanDigestInput["regression"]>;
  taskSuccess: ScanDigestInput["taskSuccess"];
}

export interface NotifyDeps {
  origin: string;
  listCandidates(): Promise<ScheduleCandidate[]>;
  getJob(jobId: string): Promise<{ status: string; runId: string | null } | null>;
  /** Mark the job as emailed. False when another caller got there first. */
  claim(candidate: ScheduleCandidate): Promise<boolean>;
  /** Undo a claim after a failed send so the next run retries. */
  release(candidate: ScheduleCandidate): Promise<void>;
  getProject(projectId: string): Promise<{ name: string; url: string } | null>;
  getOwnerEmail(userId: string): Promise<string | null>;
  getRunSummary(projectId: string, runId: string): Promise<RunSummary | null>;
  send(message: OutgoingEmail): Promise<{ ok: true } | { ok: false; error: string }>;
}

export interface NotifyResult {
  sent: number;
  skipped: number;
  failed: number;
}

const TERMINAL = new Set(["completed", "failed"]);

/**
 * Email each finished scheduled scan to its project owner, once. Claim before send
 * gives at-most-once delivery across overlapping cron calls; a failed send releases
 * the claim so the next call retries (Resend's idempotency key stops a duplicate if
 * the first send actually landed).
 */
export async function notifyFinishedScans(
  deps: NotifyDeps,
  options: { maxSends?: number } = {},
): Promise<NotifyResult> {
  const maxSends = options.maxSends ?? 25;
  const result: NotifyResult = { sent: 0, skipped: 0, failed: 0 };

  for (const candidate of await deps.listCandidates()) {
    if (result.sent >= maxSends) break;
    let claimed = false;
    try {
      const job = await deps.getJob(candidate.lastJobId);
      if (!job || !TERMINAL.has(job.status)) {
        result.skipped += 1;
        continue;
      }
      if (!(await deps.claim(candidate))) {
        result.skipped += 1;
        continue;
      }
      claimed = true;

      const [project, to] = await Promise.all([
        deps.getProject(candidate.projectId),
        deps.getOwnerEmail(candidate.userId),
      ]);
      if (!project || !to) {
        await deps.release(candidate);
        claimed = false;
        result.skipped += 1;
        continue;
      }

      let summary: RunSummary | null = null;
      if (job.status === "completed") {
        summary = job.runId ? await deps.getRunSummary(candidate.projectId, job.runId) : null;
        if (!summary) {
          await deps.release(candidate);
          claimed = false;
          result.skipped += 1;
          continue;
        }
      }

      const projectUrl = `${deps.origin}/projects/${candidate.projectId}`;
      const digest = buildScanDigest({
        projectName: project.name,
        siteUrl: project.url,
        projectUrl,
        runUrl: summary && job.runId ? `${deps.origin}/audits/${job.runId}` : null,
        outcome: job.status === "completed" ? "completed" : "failed",
        regression: summary?.regression ?? null,
        taskSuccess: summary?.taskSuccess ?? null,
      });

      const sent = await deps.send({
        to,
        ...digest,
        idempotencyKey: `scan-result-${candidate.id}-${candidate.lastJobId}`,
      });
      if (sent.ok) {
        result.sent += 1;
      } else {
        result.failed += 1;
        await deps.release(candidate);
      }
    } catch {
      result.failed += 1;
      if (claimed) await deps.release(candidate).catch(() => {});
    }
  }
  return result;
}

/** Supabase-backed data access for the cron route. Uses the service-role client. */
export function supabaseNotifyDeps(
  admin: SB,
  origin: string,
  send: NotifyDeps["send"],
): NotifyDeps {
  return {
    origin,
    send,
    async listCandidates() {
      const candidates: ScheduleCandidate[] = [];
      let offset = 0;
      while (candidates.length < 200) {
        const { data, error, count } = await admin
          .from("project_scan_schedules")
          .select("id,project_id,user_id,last_job_id,last_notified_job_id", { count: "exact" })
          .eq("enabled", true)
          .eq("notify_email", true)
          .not("last_job_id", "is", null)
          .order("last_run_at", { ascending: true })
          .order("id", { ascending: true })
          .range(offset, offset + 199);
        if (error) throw new Error(error.message);
        const rows = data ?? [];
        candidates.push(...rows
          .filter((row) => row.last_job_id && row.last_job_id !== row.last_notified_job_id)
          .map((row) => ({
            id: row.id,
            projectId: row.project_id,
            userId: row.user_id,
            lastJobId: row.last_job_id!,
            lastNotifiedJobId: row.last_notified_job_id,
          })));
        offset += rows.length;
        if (rows.length === 0 || (count != null ? offset >= count : rows.length < 200)) break;
      }
      return candidates.slice(0, 200);
    },
    async getJob(jobId) {
      const { data, error } = await admin.from("audit_jobs").select("status,result").eq("id", jobId).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const result = data.result as { runId?: unknown } | null;
      return { status: data.status, runId: typeof result?.runId === "string" ? result.runId : null };
    },
    async claim(c) {
      let query = admin
        .from("project_scan_schedules")
        .update({ last_notified_job_id: c.lastJobId })
        .eq("id", c.id)
        .eq("last_job_id", c.lastJobId);
      query = c.lastNotifiedJobId
        ? query.eq("last_notified_job_id", c.lastNotifiedJobId)
        : query.is("last_notified_job_id", null);
      const { data, error } = await query.select("id");
      if (error) throw new Error(error.message);
      return (data ?? []).length === 1;
    },
    async release(c) {
      const { error } = await admin
        .from("project_scan_schedules")
        .update({ last_notified_job_id: c.lastNotifiedJobId })
        .eq("id", c.id)
        .eq("last_notified_job_id", c.lastJobId);
      if (error) throw new Error(error.message);
    },
    async getProject(projectId) {
      const { data, error } = await admin.from("projects").select("name,url").eq("id", projectId).maybeSingle();
      if (error) throw new Error(error.message);
      return data ?? null;
    },
    async getOwnerEmail(userId) {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error) throw new Error(error.message);
      return data.user?.email ?? null;
    },
    async getRunSummary(projectId, runId) {
      const audits = await listAudits(admin, { projectId, limit: 50 });
      const index = audits.findIndex((a) => a.id === runId);
      if (index === -1) return null;
      const regression = await compareProjectRuns(admin, audits.slice(index));
      if (!regression) return null;
      const run = audits[index]!;
      return {
        regression: {
          comparisonComplete: regression.comparisonComplete,
          comparisonNotes: regression.comparisonNotes,
          isFirstScan: regression.previous === null,
          newDefects: regression.newDefects,
          cleared: regression.cleared,
          unchangedCount: regression.unchangedCount,
        },
        taskSuccess:
          run.task_success_total != null && run.task_success_achieved != null
            ? { achieved: run.task_success_achieved, total: run.task_success_total }
            : null,
      };
    },
  };
}
