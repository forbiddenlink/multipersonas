import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bearerMatches } from "@/lib/cron-auth";
import { emailConfigured, sendEmail } from "@/lib/email";
import { notifyFinishedScans, supabaseNotifyDeps } from "@/lib/scan-notify";
import { siteOrigin } from "@/lib/site-url";
import { gradeEmailRpc, supabaseGradeEmailDeps, sweepGradeEmails } from "@/lib/grade-email-notify";

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
    // Backstop for "email me this grade" requests whose worker notification never arrived.
    // It rides this daily cron so no extra cron slot is needed; it must never change this
    // route's own result, so its outcome is not reported here (failures reach Sentry).
    await sweepGradeEmails(supabaseGradeEmailDeps(gradeEmailRpc(admin), siteOrigin(), sendEmail)).catch((error) => {
      Sentry.captureException(error, { tags: { route: "grade-notify", stage: "sweep" } });
    });
    // Failed sends release their claim, so the next cron run retries them. A non-2xx here
    // does not change that; it makes the failure visible in the cron run history.
    return NextResponse.json(result, { status: result.failed > 0 ? 502 : 200 });
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "schedules-notify", stage: "run" } });
    return NextResponse.json({ error: "Could not send scan result emails." }, { status: 500 });
  }
}

export const GET = notifyScheduledScans;
export const POST = notifyScheduledScans;
