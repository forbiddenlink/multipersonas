import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Poll a queued audit job. Keyed by the job's unguessable UUID (capability URL), read via
 * the service client so both signed-in and anonymous callers can poll their own job by id.
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
    .select("status, result, error")
    .eq("id", jobId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Audit not found." }, { status: 404 });
  }

  return NextResponse.json({
    status: data.status,
    result: data.result,
    error: data.error,
  });
}
