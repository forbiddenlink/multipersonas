"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin-access";
import { isFollowUpStatus } from "@/lib/waitlist-note";

export async function setWaitlistLeadStatusAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) redirect("/dashboard");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const status = String(formData.get("status") ?? "");
  if (!email || !isFollowUpStatus(status)) redirect("/waitlist?error=invalid-lead-update");

  const admin = createAdminClient();
  if (!admin) redirect("/waitlist?error=unconfigured");

  const { error } = await admin
    .from("waitlist")
    .update({ follow_up_status: status })
    .eq("email", email);
  if (error) redirect("/waitlist?error=lead-update-failed");

  revalidatePath("/waitlist");
  redirect("/waitlist");
}
