import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bearerMatches } from "@/lib/cron-auth";
import { emailConfigured, sendEmail } from "@/lib/email";
import { notifyFinishedScans, supabaseNotifyDeps } from "@/lib/scan-notify";
import { siteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

/** Cron: email each finished scheduled scan to its project owner (see lib/scan-notify.ts). */
async function notifyScheduledScans(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Scheduled scans are not configured on this environment." },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  if (!bearerMatches(authorization, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!emailConfigured()) {
    return NextResponse.json(
      { error: "Scan result emails are not configured on this environment." },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Scheduled scans are not configured on this environment." },
      { status: 503 },
    );
  }

  try {
    const result = await notifyFinishedScans(supabaseNotifyDeps(admin, siteOrigin(), sendEmail));
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Could not send scan result emails." }, { status: 500 });
  }
}

export const GET = notifyScheduledScans;
export const POST = notifyScheduledScans;
