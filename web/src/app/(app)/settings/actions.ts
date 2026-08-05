"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateAgencyNameAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?returnTo=/settings");
  }

  const raw = String(formData.get("agencyName") ?? "").trim();
  const agency_name = raw.length > 0 ? raw.slice(0, 120) : null;

  const { error } = await supabase
    .from("profiles")
    .update({ agency_name })
    .eq("id", user.id);

  if (error) {
    redirect("/settings?error=agency");
  }

  revalidatePath("/settings");
  revalidatePath("/audits");
  redirect("/settings?saved=agency");
}
