import type { SupabaseClient } from "@supabase/supabase-js";
import type { GradeScanResult } from "multipersonas/grader";

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
