"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { defaultShareExpiry, generateShareToken, shareState } from "@/lib/share-token";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function reportPath(runId: string): string {
  return `/audits/${runId}/report`;
}

async function requireOwnerClient(runId: string) {
  if (!UUID_RE.test(runId)) redirect("/dashboard");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?returnTo=${encodeURIComponent(reportPath(runId))}`);
  return { supabase, userId: user.id };
}

/**
 * Mint a share link for a completed run the caller owns. The token comes from Node crypto
 * on the server; the client never supplies one. Ownership is enforced twice: the explicit
 * user_id filter, and the test_runs update policy under RLS (a run that is not theirs
 * updates zero rows). An already-active link is left alone so a double click cannot
 * silently kill a link the owner already sent.
 */
export async function createShareLinkAction(runId: string): Promise<void> {
  const { supabase, userId } = await requireOwnerClient(runId);

  const { data: current } = await supabase
    .from("test_runs")
    .select("share_token,share_expires_at,share_revoked_at")
    .eq("id", runId)
    .eq("user_id", userId)
    .maybeSingle();
  if (current && shareState(current) === "active") {
    redirect(reportPath(runId));
  }

  const { data, error } = await supabase
    .from("test_runs")
    .update({
      share_token: generateShareToken(),
      share_expires_at: defaultShareExpiry().toISOString(),
      share_revoked_at: null,
    })
    .eq("id", runId)
    .eq("user_id", userId)
    .eq("status", "completed")
    .select("id");

  if (error || !data || data.length === 0) {
    redirect(`${reportPath(runId)}?share=error`);
  }

  revalidatePath(reportPath(runId));
  redirect(reportPath(runId));
}

/** Revoke the run's link. The token stays on the row so the old URL reads as inactive. */
export async function revokeShareLinkAction(runId: string): Promise<void> {
  const { supabase, userId } = await requireOwnerClient(runId);

  const { data, error } = await supabase
    .from("test_runs")
    .update({ share_revoked_at: new Date().toISOString() })
    .eq("id", runId)
    .eq("user_id", userId)
    .not("share_token", "is", null)
    .is("share_revoked_at", null)
    .select("id");

  if (error || !data || data.length === 0) {
    redirect(`${reportPath(runId)}?share=error`);
  }

  revalidatePath(reportPath(runId));
  redirect(reportPath(runId));
}
