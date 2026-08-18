"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createProject, updateProject, deleteProject } from "@/lib/projects";

function readProjectFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const descriptionRaw = formData.get("description");
  const description = descriptionRaw ? String(descriptionRaw).trim() : "";
  return { name, url, description: description || null };
}

/** Accept only http(s) URLs, normalized to their canonical form (same spirit as the
 * audit route's URL guard, minus the SSRF/private-network checks — a project's site
 * is only ever used as a display value + the audit form's prefill, never fetched here). */
function normalizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export async function createProjectAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/projects");

  const { name, url, description } = readProjectFields(formData);
  if (!name) {
    redirect(`/projects?error=${encodeURIComponent("Give the project a name.")}`);
  }
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl) {
    redirect(`/projects?error=${encodeURIComponent("Enter a valid http(s) URL.")}`);
  }

  let project;
  try {
    project = await createProject(supabase, user.id, {
      name,
      url: normalizedUrl,
      description,
    });
  } catch {
    redirect(`/projects?error=${encodeURIComponent("Could not create the project.")}`);
  }
  if (!project) {
    redirect(`/projects?error=${encodeURIComponent("Could not create the project.")}`);
  }

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function updateProjectAction(id: string, formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/projects");

  const { name, description } = readProjectFields(formData);
  if (!name) {
    redirect(`/projects/${id}?error=${encodeURIComponent("Give the project a name.")}`);
  }

  let updated;
  try {
    updated = await updateProject(supabase, id, { name, description });
  } catch {
    redirect(`/projects/${id}?error=${encodeURIComponent("Could not update the project.")}`);
  }
  if (!updated) {
    redirect(`/projects/${id}?error=${encodeURIComponent("Could not update the project.")}`);
  }

  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  redirect(`/projects/${id}`);
}

export async function deleteProjectAction(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/projects");

  try {
    await deleteProject(supabase, id);
  } catch {
    redirect(`/projects/${id}?error=${encodeURIComponent("Could not delete the project.")}`);
  }

  revalidatePath("/projects");
  redirect("/projects");
}
