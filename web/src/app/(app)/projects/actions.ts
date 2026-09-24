"use server";

import { TASK_INPUT_ERROR, TASK_ORIGIN_ERROR } from "@/lib/tasks";
import { parseTaskDefinition } from "@engine/tasks/definition";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createProject, updateProject, deleteProject, getProject } from "@/lib/projects";
import { getExactPlan, getSessionPlan, planAllowsPersonas, projectLimitFor } from "@/lib/entitlements";
import { isScanInterval, upsertProjectSchedule } from "@/lib/schedules";

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

  // Tier cap. getExactPlan fails closed to "free" (the smallest cap), so a read error
  // blocks a new project rather than handing out a paid-tier allowance.
  const plan = await getExactPlan(supabase, user.id);
  const limit = projectLimitFor(plan);
  if (limit !== null) {
    const { count, error: countError } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (countError || count === null) {
      redirect(`/projects?error=${encodeURIComponent("Could not check your project allowance. Please try again.")}`);
    }
    if (count >= limit) {
      const message = `Your plan includes ${limit} project${limit === 1 ? "" : "s"}. See pricing to add more.`;
      redirect(`/projects?error=${encodeURIComponent(message)}`);
    }
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

export async function upsertProjectScheduleAction(
  projectId: string,
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/projects/${projectId}`);

  const project = await getProject(supabase, projectId);
  if (!project) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Project not found.")}`);
  }

  const plan = await getSessionPlan(supabase, user.id);
  if (!planAllowsPersonas(plan)) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Scheduled scans are a Pro feature.")}`);
  }

  const intervalRaw = String(formData.get("interval") ?? "weekly");
  if (!isScanInterval(intervalRaw)) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Choose a valid scan interval.")}`);
  }

  const enabled = formData.get("enabled") === "on";

  try {
    await upsertProjectSchedule(supabase, {
      userId: user.id,
      projectId: project.id,
      interval: intervalRaw,
      enabled,
    });
  } catch {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Could not save the scan schedule.")}`);
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function saveProjectTaskAction(projectId: string, formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/projects");
  const goal = String(formData.get("goal") ?? "").trim();
  const successText = String(formData.get("successText") ?? "").trim();
  const expectedUrl = String(formData.get("expectedUrl") ?? "").trim();
  const requireNewText = formData.get("requireNewText") === "on";
  const task = parseTaskDefinition(expectedUrl || requireNewText
    ? { version: 2, goal, successText, requireNewText, ...(expectedUrl ? { expectedUrl } : {}) }
    : { version: 1, goal, successText });
  if ((goal || successText || expectedUrl || requireNewText) && !task) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent(TASK_INPUT_ERROR)}`);
  }
  if (task?.version === 2 && task.expectedUrl) {
    const project = await getProject(supabase, projectId);
    if (!project) redirect(`/projects/${projectId}?error=${encodeURIComponent("Project not found.")}`);
    if (new URL(task.expectedUrl).origin !== new URL(project.url).origin) {
      redirect(`/projects/${projectId}?error=${encodeURIComponent(TASK_ORIGIN_ERROR)}`);
    }
  }
  let updated;
  try {
    updated = await updateProject(supabase, projectId, { task_definition: task });
  } catch {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Could not save the task.")}`);
  }
  if (!updated) redirect(`/projects/${projectId}?error=${encodeURIComponent("Project not found.")}`);
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}
