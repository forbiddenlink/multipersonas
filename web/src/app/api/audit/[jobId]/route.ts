import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Poll a queued audit job. Read via the service client (audit_jobs has no client read
 * policy for anonymous rows) and keyed by the job's unguessable UUID (capability URL).
 *
 * Ownership: an ANONYMOUS job (user_id === null) is reachable by anyone holding its
 * capability URL — that is the whole poll mechanism for logged-out runs. But a job that
 * BELONGS to a signed-in user carries the full audit result (target URL + every finding)
 * and is RLS-protected everywhere else; serving it here to any bearer of the id would be a
 * second, unprotected copy of that user's private data (the id leaks via browser history,
 * shared screenshots, proxy logs). So for owned jobs we require the caller's session to
 * match the owner, and return the same 404 as a missing job on mismatch — never confirming
 * the id exists to someone who does not own it.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Audits are not configured on this environment." },
      { status: 503 },
    );
  }

  const { data, error } = await admin
    .from("audit_jobs")
    .select("status, result, error, user_id, kind")
    .eq("id", jobId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Audit not found." }, { status: 404 });
  }

  // Owned job: only its owner may read it. Anonymous jobs (user_id === null) stay
  // readable by capability URL. 404 (not 403) so a non-owner cannot even confirm the id.
  if (data.user_id !== null) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== data.user_id) {
      return NextResponse.json({ error: "Audit not found." }, { status: 404 });
    }
  }

  return NextResponse.json({
    status: data.status,
    // Grader engine output is retained for internal scope review. Its public
    // representation is served by the separate grade-token endpoint.
    result: data.kind === "grade" ? null : data.result,
    error: data.error,
  });
}
