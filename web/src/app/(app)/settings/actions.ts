"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateAgencyNameAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const raw = String(formData.get("agencyName") ?? "").trim();
  const agency_name = raw.length > 0 ? raw.slice(0, 120) : null;

  await supabase.from("profiles").update({ agency_name }).eq("id", user.id);
  revalidatePath("/settings");
  revalidatePath("/audits");
}
