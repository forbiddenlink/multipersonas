import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { assembleReport, loadReportRows, type FindingRow, type ReportData } from "@/lib/report";
import { isShareTokenShape } from "@/lib/share-token";

type SB = SupabaseClient<Database>;

/**
 * Load a report through a share token. Returns null when the token is malformed,
 * unknown, revoked, expired, or the run is not completed; the database functions
 * return no rows in every one of those cases, so callers cannot tell them apart and
 * the page shows one "link no longer active" state.
 *
 * Reads only through the SECURITY DEFINER functions. No table is read directly, so the
 * caller needs no table grants and sees only the explicit column lists.
 */
export async function loadSharedReport(supabase: SB, token: string): Promise<ReportData | null> {
  if (!isShareTokenShape(token)) return null;

  const { data: runs, error } = await supabase.rpc("get_shared_report", { p_token: token });
  if (error) throw new Error("Could not load shared report.");
  const run = runs?.[0];
  if (!run) return null;

  const findingRows = await loadReportRows<FindingRow>((from, to) =>
    supabase
      .rpc("get_shared_report_findings", { p_token: token }, { count: "exact" })
      .range(from, to),
  );
  const journeyRows = await loadReportRows((from, to) =>
    supabase
      .rpc("get_shared_report_journey", { p_token: token }, { count: "exact" })
      .range(from, to),
  );

  return assembleReport(
    {
      id: run.run_id,
      url: run.url,
      created_at: run.created_at,
      persona_ids: run.persona_ids,
      task_definition: run.task_definition,
      task_outcomes: run.task_outcomes,
      scan_coverage: run.scan_coverage,
    },
    findingRows,
    journeyRows,
    { clientName: run.client_name, agencyName: run.agency_name },
  );
}
