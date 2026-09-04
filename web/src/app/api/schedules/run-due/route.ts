import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function runDueSchedules(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Scheduled scans are not configured on this environment." },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  if (authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Scheduled scans are not configured on this environment." },
      { status: 503 },
    );
  }

  const { data, error } = await admin.rpc("enqueue_due_project_scan_schedules", {
    p_limit: 25,
  });

  if (error) {
    return NextResponse.json(
      { error: "Could not enqueue scheduled scans." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    enqueued: Array.isArray(data) ? data.length : 0,
    jobs: data ?? [],
  });
}

export const GET = runDueSchedules;
export const POST = runDueSchedules;
