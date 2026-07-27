import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type SB = SupabaseClient<Database>;

const SEVERITIES = ["critical", "serious", "moderate", "minor"] as const;
const CATEGORIES = ["accessibility", "usability", "performance", "content"] as const;
type Severity = (typeof SEVERITIES)[number];
type Category = (typeof CATEGORIES)[number];

function clampSeverity(s: string): Severity {
  return (SEVERITIES as readonly string[]).includes(s) ? (s as Severity) : "moderate";
}
function clampCategory(c: string): Category {
  return (CATEGORIES as readonly string[]).includes(c) ? (c as Category) : "usability";
}

export interface SaveablePersona {
  id: string;
  findings: { severity: string; category: string; title: string; description: string; recommendation: string }[];
}

export interface SaveableAudit {
  url: string;
  taskSuccess: { achieved: number; total: number };
  personas: SaveablePersona[];
  axeFindings: { severity: string; title: string; description: string; recommendation: string }[];
}

/**
 * Persist a completed audit for a signed-in user. Best-effort: returns the run id, or
 * null if the write failed. The caller must not fail the audit response on a null here —
 * a saved report is a nicety, the result is already in hand.
 *
 * Findings are stored with an explicit `source`: axe violations ('axe', deterministic
 * compliance) are kept separate from persona notes ('persona', LLM opinion). The two are
 * never merged — the honesty constraint from docs/PLAN-2026-07-15 held at the data layer.
 */
export async function saveAudit(
  supabase: SB,
  userId: string,
  audit: SaveableAudit,
): Promise<string | null> {
  const now = new Date().toISOString();

  const { data: run, error: runErr } = await supabase
    .from("test_runs")
    .insert({
      user_id: userId,
      url: audit.url,
      status: "completed",
      task_success_achieved: audit.taskSuccess.achieved,
      task_success_total: audit.taskSuccess.total,
      persona_ids: audit.personas.map((p) => p.id),
      started_at: now,
      completed_at: now,
    })
    .select("id")
    .single();

  if (runErr || !run) return null;

  const findingRows = [
    ...audit.axeFindings.map((f) => ({
      test_run_id: run.id,
      persona_id: "axe",
      source: "axe" as const,
      severity: clampSeverity(f.severity),
      category: "accessibility" as const,
      title: f.title,
      description: f.description,
      recommendation: f.recommendation,
      page_url: audit.url,
    })),
    ...audit.personas.flatMap((p) =>
      p.findings.map((f) => ({
        test_run_id: run.id,
        persona_id: p.id,
        source: "persona" as const,
        severity: clampSeverity(f.severity),
        category: clampCategory(f.category),
        title: f.title,
        description: f.description,
        recommendation: f.recommendation,
        page_url: audit.url,
      })),
    ),
  ];

  if (findingRows.length > 0) {
    // Non-fatal: the run is saved even if findings fail to write.
    await supabase.from("findings").insert(findingRows);
  }

  return run.id;
}

export interface AuditListItem {
  id: string;
  url: string;
  created_at: string;
  task_success_achieved: number | null;
  task_success_total: number | null;
  persona_ids: string[];
}

/** List a user's saved audits, newest first. RLS scopes rows to the caller. */
export async function listAudits(supabase: SB, limit = 20): Promise<AuditListItem[]> {
  const { data } = await supabase
    .from("test_runs")
    .select("id,url,created_at,task_success_achieved,task_success_total,persona_ids")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
