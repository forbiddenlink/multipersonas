import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert, TablesUpdate } from "@/lib/supabase/types";
import { DEFAULT_PERSONA_IDS, type PersonaId } from "@/lib/personas";

type SB = SupabaseClient<Database>;

export const SCAN_INTERVALS = ["weekly", "monthly"] as const;
export type ScanInterval = (typeof SCAN_INTERVALS)[number];

export interface ProjectScanSchedule {
  id: string;
  project_id: string;
  user_id: string;
  interval: ScanInterval;
  persona_ids: string[];
  enabled: boolean;
  next_run_at: string;
  last_run_at: string | null;
  last_job_id: string | null;
  created_at: string;
  updated_at: string;
}

const SCHEDULE_COLUMNS =
  "id,project_id,user_id,interval,persona_ids,enabled,next_run_at,last_run_at,last_job_id,created_at,updated_at";

export function isScanInterval(value: string): value is ScanInterval {
  return SCAN_INTERVALS.includes(value as ScanInterval);
}

export function defaultSchedulePersonaIds(): PersonaId[] {
  return [...DEFAULT_PERSONA_IDS];
}

export async function getProjectSchedule(
  supabase: SB,
  projectId: string,
): Promise<ProjectScanSchedule | null> {
  const { data } = await supabase
    .from("project_scan_schedules")
    .select(SCHEDULE_COLUMNS)
    .eq("project_id", projectId)
    .maybeSingle();
  return (data as ProjectScanSchedule | null) ?? null;
}

export interface UpsertProjectScheduleInput {
  userId: string;
  projectId: string;
  interval: ScanInterval;
  personaIds?: string[];
  enabled: boolean;
}

export async function upsertProjectSchedule(
  supabase: SB,
  input: UpsertProjectScheduleInput,
): Promise<ProjectScanSchedule | null> {
  const row: TablesInsert<"project_scan_schedules"> = {
    user_id: input.userId,
    project_id: input.projectId,
    interval: input.interval,
    persona_ids: input.personaIds?.length ? input.personaIds : defaultSchedulePersonaIds(),
    enabled: input.enabled,
  };

  const { data, error } = await supabase
    .from("project_scan_schedules")
    .upsert(row, { onConflict: "project_id" })
    .select(SCHEDULE_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return (data as ProjectScanSchedule | null) ?? null;
}

export async function updateProjectSchedule(
  supabase: SB,
  scheduleId: string,
  input: TablesUpdate<"project_scan_schedules">,
): Promise<ProjectScanSchedule | null> {
  const { data, error } = await supabase
    .from("project_scan_schedules")
    .update(input)
    .eq("id", scheduleId)
    .select(SCHEDULE_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return (data as ProjectScanSchedule | null) ?? null;
}
