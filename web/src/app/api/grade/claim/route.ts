import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseGradeTokens } from "@/lib/grade-tokens";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to save grades." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const tokens = parseGradeTokens((body as { tokens?: unknown }).tokens);
  if (tokens.length === 0) {
    return NextResponse.json({ claimed: 0 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Grading is not configured." }, { status: 503 });
  }

  const { data, error } = await admin
    .from("grader_scans")
    .update({ user_id: user.id })
    .in("token", tokens)
    .is("user_id", null)
    .select("token");

  if (error) {
    Sentry.captureException(error, { tags: { route: "grade-claim" } });
    return NextResponse.json({ error: "Could not save those grades." }, { status: 500 });
  }

  return NextResponse.json({ claimed: data?.length ?? 0 });
}
