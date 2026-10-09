import type { SupabaseClient } from "@supabase/supabase-js";
import type { GradeScanResult } from "personaudit/grader";

/** Persist a queue transition before reporting success or releasing budget. */
export async function writeJobState(write: PromiseLike<{ error: { message: string } | null }>): Promise<void> {
  const { error } = await write;
  if (error) throw new Error(`Job persistence failed: ${error.message}`);
}

/** Keep the complete engine evidence before acknowledging a public grade job. */
export async function persistGradeResult(
  supabase: SupabaseClient,
  jobId: string,
  result: GradeScanResult,
): Promise<void> {
  await writeJobState(supabase
    .from("audit_jobs")
    .update({ result })
    .eq("id", jobId).select("id").single());
  await writeJobState(supabase
    .from("grader_scans")
    .update({ report: result.report, pages_visited: result.pagesVisited, status: "completed", error: null })
    .eq("job_id", jobId).select("token").single());
  await writeJobState(supabase
    .from("audit_jobs")
    .update({ status: "completed", error: null, completed_at: new Date().toISOString() })
    .eq("id", jobId).select("id").single());
}

/** Finish history only after saving findings; failed writes must not leave a running audit. */
export async function saveHistoryRun(
  supabase: SupabaseClient,
  runId: string,
  rows: Record<string, unknown>[],
): Promise<void> {
  try {
    if (rows.length > 0) {
      const { error } = await supabase.from("findings").insert(rows);
      if (error) throw new Error(`History findings persistence failed: ${error.message}`);
    }
    const { data, error } = await supabase.from("test_runs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", runId).eq("status", "running").select("id").single();
    if (error || !data) {
      throw new Error(`History completion persistence failed: ${error?.message ?? "no row updated"}`);
    }
  } catch (error) {
    try {
      const { data, error: failureError } = await supabase.from("test_runs")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("id", runId).eq("status", "running").select("id").single();
      if (failureError || !data) {
        throw new Error(`History failure persistence failed: ${failureError?.message ?? "no row updated"}`);
      }
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "History save failed and its failed status could not be persisted");
    }
    throw error;
  }
}

/** Tag a finished job's result with the saved run it produced (signed-in runs only), so the
 * browser can link to /audits/<id> without a second lookup. Anonymous runs persist no run. */
export function withRunId<T extends object>(response: T, runId: string | null): T | (T & { runId: string }) {
  return runId ? { ...response, runId } : response;
}
