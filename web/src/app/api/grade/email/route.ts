import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailConfigured, sendEmail } from "@/lib/email";
import { getClientIP } from "@/lib/client-ip";
import { verifyTurnstile } from "@/lib/turnstile";
import { killSwitchEnabled } from "@/lib/limits";
import { isGradeToken } from "@/lib/grade";
import { normalizeGradeEmail } from "@/lib/grade-email";
import { siteOrigin } from "@/lib/site-url";
import {
  captureGradeEmail,
  gradeEmailRpc,
  gradeEmailStorageReady,
  sendGradeEmail,
  supabaseGradeEmailDeps,
} from "@/lib/grade-email-notify";

export const dynamic = "force-dynamic";

// Optional "email me this grade" capture. The free grade itself never needs this.

/**
 * Whether the field should be shown. Fail closed: off unless the mail provider is configured
 * AND the storage migration has been applied, so the UI never offers what it cannot deliver.
 */
export async function GET() {
  const headers = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };
  if (!emailConfigured() || killSwitchEnabled()) return NextResponse.json({ enabled: false }, { headers });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ enabled: false }, { headers });
  return NextResponse.json({ enabled: await gradeEmailStorageReady(gradeEmailRpc(admin)) }, { headers });
}

const MESSAGES = {
  rate_limited: "Too many email requests. Please try again later.",
  not_found: "We could not find that grade.",
  expired: "That grade is too old to email. Open the result link instead.",
} as const;

export async function POST(request: Request) {
  if (killSwitchEnabled() || !emailConfigured()) {
    return NextResponse.json({ error: "Email is not available right now." }, { status: 503 });
  }

  let body: { token?: unknown; email?: unknown; turnstileToken?: unknown };
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    body = parsed;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isGradeToken(body.token)) {
    return NextResponse.json({ error: "We could not find that grade." }, { status: 400 });
  }
  const email = normalizeGradeEmail(body.email);
  if (!email) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const ip = getClientIP(request);
  const turnstile = await verifyTurnstile(
    typeof body.turnstileToken === "string" ? body.turnstileToken : undefined,
    ip,
  );
  if (!turnstile.ok) {
    return NextResponse.json(
      { error: "Verification failed. Please refresh the page and try again." },
      { status: 403 },
    );
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Email is not available right now." }, { status: 503 });
  const db = gradeEmailRpc(admin);

  const status = await captureGradeEmail(db, { token: body.token, email, ip });
  if (status === "unavailable") {
    return NextResponse.json({ error: "Email is not available right now." }, { status: 503 });
  }
  if (status === "rate_limited") {
    return NextResponse.json({ error: MESSAGES.rate_limited }, { status: 429, headers: { "Retry-After": "3600" } });
  }
  if (status === "not_found" || status === "expired") {
    return NextResponse.json({ error: MESSAGES[status] }, { status: status === "expired" ? 410 : 404 });
  }

  // The grade may have finished between page render and this request. Try once now; if it is
  // still running this is a no-op and the worker (or the daily sweep) sends it later.
  if (status === "saved") {
    await sendGradeEmail(supabaseGradeEmailDeps(db, siteOrigin(), sendEmail), body.token).catch(() => {});
  }
  return NextResponse.json({ status }, { status: 200 });
}
