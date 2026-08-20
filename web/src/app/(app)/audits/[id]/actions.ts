"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isFindingStatus, resolvedAtForStatus } from "@/lib/finding-workflow";
import { createClient } from "@/lib/supabase/server";

export async function updateFindingWorkflowAction(
  runId: string,
  findingId: string,
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/audits/${runId}`);

  const statusRaw = String(formData.get("status") ?? "");
  if (!isFindingStatus(statusRaw)) {
    redirect(`/audits/${runId}?error=${encodeURIComponent("Choose a valid finding status.")}`);
  }

  const owner = String(formData.get("owner") ?? "").trim().slice(0, 200);
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 2000);

  const { error } = await supabase
    .from("findings")
    .update({
      status: statusRaw,
      owner: owner || null,
      notes: notes || null,
      resolved_at: resolvedAtForStatus(statusRaw),
    })
    .eq("id", findingId)
    .eq("test_run_id", runId);

  if (error) {
    redirect(`/audits/${runId}?error=${encodeURIComponent("Could not update the finding.")}`);
  }

  revalidatePath(`/audits/${runId}`);
  revalidatePath(`/audits/${runId}/report`);
}
