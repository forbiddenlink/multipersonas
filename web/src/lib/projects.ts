import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert, TablesUpdate } from "@/lib/supabase/types";

type SB = SupabaseClient<Database>;

export interface ProjectListItem {
  id: string;
  name: string;
  url: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project extends ProjectListItem {
  user_id: string;
}

const LIST_COLUMNS = "id,name,url,description,created_at,updated_at";
const DETAIL_COLUMNS = `${LIST_COLUMNS},user_id`;

/**
 * List the caller's projects, newest first. RLS scopes rows to the caller, so no
 * explicit `user_id` filter is needed here (mirrors lib/audits.ts).
 */
export async function listProjects(supabase: SB): Promise<ProjectListItem[]> {
  const { data } = await supabase
    .from("projects")
    .select(LIST_COLUMNS)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Fetch a single project by id. Returns null if missing or not owned (RLS). */
export async function getProject(supabase: SB, id: string): Promise<Project | null> {
  const { data } = await supabase
    .from("projects")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .single();
  return data ?? null;
}

export interface CreateProjectInput {
  name: string;
  url: string;
  description?: string | null;
}

/** Create a project owned by `userId`. Caller must supply the authenticated user's id. */
export async function createProject(
  supabase: SB,
  userId: string,
  input: CreateProjectInput,
): Promise<Project | null> {
  const row: TablesInsert<"projects"> = {
    user_id: userId,
    name: input.name,
    url: input.url,
    description: input.description ?? null,
  };
  const { data, error } = await supabase
    .from("projects")
    .insert(row)
    .select(DETAIL_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export interface UpdateProjectInput {
  name?: string;
  url?: string;
  description?: string | null;
}

/** Update a project. RLS restricts this to rows owned by the caller. */
export async function updateProject(
  supabase: SB,
  id: string,
  input: UpdateProjectInput,
): Promise<Project | null> {
  const patch: TablesUpdate<"projects"> = { ...input };
  const { data, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", id)
    .select(DETAIL_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data ?? null;
}

/**
 * Delete a project. RLS restricts this to rows owned by the caller. The
 * `test_runs.project_id -> on delete cascade` FK means this also deletes every
 * saved run (and its findings) for the project — callers must warn before calling.
 */
export async function deleteProject(supabase: SB, id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
