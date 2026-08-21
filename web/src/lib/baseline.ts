import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Finding } from "@engine/agent/engine";
import { defectKey } from "@engine/agent/defect-key";
import {
  baselineFromFindings,
  evaluateGate,
  type Severity,
} from "@engine/crawler/gate";
import { clampSeverity } from "@engine/domain/vocab";
import type { Database } from "@/lib/supabase/types";
import type { AuditListItem } from "@/lib/audits";

type SB = SupabaseClient<Database>;

/** Axe-only finding row shaped for the CLI gate identity key. */
export interface AxeFindingRow {
  id: string;
  title: string;
  severity: string;
  rule_id: string | null;
  target: string | null;
  page_url: string;
  description: string;
}

export interface ClearedDefect {
  key: string;
  title: string;
  severity: Severity;
  ruleId: string | null;
}

export interface RunRegression {
  /** Newest completed run for the project. */
  current: AuditListItem;
  /** Immediately older run — null on the first scan. */
  previous: AuditListItem | null;
  newDefects: Array<{
    title: string;
    severity: Severity;
    ruleId: string | null;
    target: string | null;
    pageUrl: string;
    key: string;
  }>;
  cleared: ClearedDefect[];
  unchangedCount: number;
  /** True when previous-run rows lack `target` (pre-migration) — keys may be weaker. */
  identityPartial: boolean;
}

function asSeverity(s: string): Severity {
  return clampSeverity(s);
}

/** Map a persisted axe row into the engine Finding shape the gate expects. */
export function rowToFinding(row: AxeFindingRow): Finding {
  return {
    severity: asSeverity(row.severity),
    category: "accessibility",
    title: row.title,
    description: row.description,
    recommendation: "",
    pageUrl: row.page_url,
    ruleId: row.rule_id ?? undefined,
    target: row.target ?? undefined,
  };
}

async function loadAxeFindings(supabase: SB, runId: string): Promise<AxeFindingRow[]> {
  const { data } = await supabase
    .from("findings")
    .select("id,title,severity,rule_id,target,page_url,description")
    .eq("test_run_id", runId)
    .eq("source", "axe");
  return (data ?? []) as AxeFindingRow[];
}

/**
 * Compare the two newest project runs using the same defectKey + evaluateGate
 * the CLI CI gate uses. Verdicts only (axe). Persona opinion never enters.
 */
export async function compareProjectRuns(
  supabase: SB,
  audits: AuditListItem[],
): Promise<RunRegression | null> {
  if (audits.length === 0) return null;

  const current = audits[0]!;
  const previous = audits[1] ?? null;

  const currentRows = await loadAxeFindings(supabase, current.id);
  const previousRows = previous ? await loadAxeFindings(supabase, previous.id) : [];

  const currentFindings = currentRows.map(rowToFinding);
  const previousFindings = previousRows.map(rowToFinding);

  const baseline = previous
    ? baselineFromFindings(previousFindings, {
        url: previous.url,
        createdAt: previous.created_at,
      })
    : null;

  const gate = evaluateGate(currentFindings, {
    failOn: "minor", // UI wants every new defect; CI threshold is separate
    baseline,
  });

  const previousByKey = new Map(
    previousFindings.map((f) => [defectKey(f), f] as const),
  );

  const cleared: ClearedDefect[] = gate.fixed.map((key) => {
    const f = previousByKey.get(key);
    return {
      key,
      title: f?.title ?? key.split("|")[0] ?? key,
      severity: f?.severity ?? "moderate",
      ruleId: f?.ruleId ?? null,
    };
  });

  const currentKeys = new Set(currentFindings.map((f) => defectKey(f)));
  const baselineKeys = new Set(baseline?.keys ?? []);
  let unchangedCount = 0;
  for (const k of currentKeys) {
    if (baselineKeys.has(k)) unchangedCount += 1;
  }

  const identityPartial =
    currentRows.some((r) => !r.target) || previousRows.some((r) => !r.target);

  return {
    current,
    previous,
    newDefects: gate.newDefects.map((f) => ({
      title: f.title,
      severity: f.severity,
      ruleId: f.ruleId ?? null,
      target: f.target ?? null,
      pageUrl: f.pageUrl,
      key: defectKey(f),
    })),
    cleared,
    unchangedCount,
    identityPartial,
  };
}
