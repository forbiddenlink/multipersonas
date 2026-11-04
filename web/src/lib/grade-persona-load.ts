import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseGradePersona, type GradePersonaView } from "@/lib/grade-persona";

const SIGNED_URL_TTL_SECONDS = 60 * 30;

export type LoadedGradePersona = {
  view: GradePersonaView;
  /** Short-lived signed URL for the stuck frame, or null. */
  screenshotUrl: string | null;
};

/**
 * The optional persona walk for a finished grade, or null when none was planned. Never
 * throws: the grade renders without this block if the read or the signing fails.
 */
export async function getGradePersona(jobId: string | null): Promise<LoadedGradePersona | null> {
  if (!jobId) return null;
  try {
    const admin = createAdminClient();
    if (!admin) return null;
    const { data, error } = await admin
      .from("audit_jobs")
      .select("persona:result->persona")
      .eq("id", jobId)
      .maybeSingle();
    if (error || !data) return null;
    const view = parseGradePersona(data.persona);
    if (!view) return null;

    let screenshotUrl: string | null = null;
    if (view.kind === "ready" && view.screenshotPath) {
      const { data: signed } = await admin.storage
        .from("journeys")
        .createSignedUrl(view.screenshotPath, SIGNED_URL_TTL_SECONDS);
      screenshotUrl = signed?.signedUrl ?? null;
    }
    return { view, screenshotUrl };
  } catch {
    return null;
  }
}
