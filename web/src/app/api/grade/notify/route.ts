import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bearerMatches } from "@/lib/cron-auth";
import { emailConfigured, sendEmail } from "@/lib/email";
import { isGradeToken } from "@/lib/grade";
import { siteOrigin } from "@/lib/site-url";
import {
  gradeEmailRpc,
  sendGradeEmail,
  sweepGradeEmails,
  supabaseGradeEmailDeps,
} from "@/lib/grade-email-notify";

export const dynamic = "force-dynamic";

/**
 * Called by the worker the moment a grade finishes or fails (POST {token}), authenticated with
 * the same shared CRON_SECRET bearer the cron routes use. A call with no token sweeps every
 * finished-but-unsent request: the backstop for a missed worker call or a reaper dead-letter.
 */
async function notify(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Grade emails are not configured on this environment." }, { status: 503 });
  }
  if (!bearerMatches(request.headers.get("authorization") ?? "", secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!emailConfigured()) {
    return NextResponse.json({ error: "Grade emails are not configured on this environment." }, { status: 503 });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Grade emails are not configured on this environment." }, { status: 503 });
  }

  let token: unknown;
  if (request.method === "POST") {
    try {
      const parsed = (await request.json()) as { token?: unknown } | null;
      token = parsed?.token;
    } catch {
      token = undefined;
    }
  }

  const deps = supabaseGradeEmailDeps(gradeEmailRpc(admin), siteOrigin(), sendEmail);
  try {
    if (token !== undefined) {
      if (!isGradeToken(token)) return NextResponse.json({ error: "Invalid token" }, { status: 400 });
      const outcome = await sendGradeEmail(deps, token);
      return NextResponse.json({ outcome }, { status: outcome === "failed" ? 502 : 200 });
    }
    const result = await sweepGradeEmails(deps);
    return NextResponse.json(result, { status: result.failed > 0 ? 502 : 200 });
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "grade-notify", stage: "run" } });
    return NextResponse.json({ error: "Could not send grade emails." }, { status: 500 });
  }
}

export const GET = notify;
export const POST = notify;
