import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { loadSharedReport } from "./shared-report";
import { generateShareToken } from "./share-token";

type Rows = Record<string, unknown[]>;

/** Stands in for the three SECURITY DEFINER functions. The real expiry and revocation
 * logic is proven in supabase/tests/report-share-links.sql; here an empty result is what
 * the database returns for every inactive token. */
function fakeClient(rows: Rows, errorFor?: string) {
  const rpc = vi.fn((name: string) => {
    const data = rows[name] ?? [];
    const result = errorFor === name
      ? { data: null, error: { message: "boom" }, count: null }
      : { data, error: null, count: data.length };
    return Object.assign(Promise.resolve(result), {
      range: (from: number, to: number) =>
        Promise.resolve(
          errorFor === name ? result : { ...result, data: data.slice(from, to + 1) },
        ),
    });
  });
  return { client: { rpc } as unknown as SupabaseClient<Database>, rpc };
}

const runRow = {
  run_id: "11111111-1111-4111-8111-111111111111",
  url: "https://client.example",
  created_at: "2026-10-01T12:00:00Z",
  persona_ids: ["elderly-user"],
  task_definition: null,
  task_outcomes: [],
  scan_coverage: null,
  client_name: "Client One",
  agency_name: "Acme Access",
};

const finding = (over: Record<string, unknown>) => ({
  id: "f1",
  source: "axe",
  severity: "serious",
  title: "Elements must have sufficient color contrast",
  description: "d",
  recommendation: "r",
  rule_id: "color-contrast",
  wcag_tags: ["wcag2aa", "wcag143"],
  page_url: "https://client.example/checkout",
  ...over,
});

describe("loadSharedReport", () => {
  it("never calls the database for a malformed token", async () => {
    const { client, rpc } = fakeClient({});
    expect(await loadSharedReport(client, "short")).toBeNull();
    expect(await loadSharedReport(client, "../../etc/passwd")).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns null for an expired, revoked or unknown token (the function returns no rows)", async () => {
    const { client, rpc } = fakeClient({ get_shared_report: [] });
    expect(await loadSharedReport(client, generateShareToken())).toBeNull();
    // The run lookup is the gate: no findings or journey read follows an empty result.
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("assembles the report for a valid token, axe verdicts only", async () => {
    const { client, rpc } = fakeClient({
      get_shared_report: [runRow],
      get_shared_report_findings: [
        finding({ id: "a" }),
        finding({ id: "p", source: "persona", title: "persona opinion" }),
      ],
      get_shared_report_journey: [],
    });
    const token = generateShareToken();
    const report = await loadSharedReport(client, token);
    expect(report).not.toBeNull();
    expect(report!.runId).toBe(runRow.run_id);
    expect(report!.clientName).toBe("Client One");
    expect(report!.agencyName).toBe("Acme Access");
    expect(report!.verdicts.map((v) => v.id)).toEqual(["a"]);
    expect(report!.projectId).toBeNull();
    // Only the three explicit functions are called, always with the token.
    const names = rpc.mock.calls.map((c) => c[0]);
    expect(new Set(names)).toEqual(
      new Set(["get_shared_report", "get_shared_report_findings", "get_shared_report_journey"]),
    );
  });

  it("throws, without leaking provider detail, when the lookup errors", async () => {
    const { client } = fakeClient({}, "get_shared_report");
    await expect(loadSharedReport(client, generateShareToken())).rejects.toThrow(
      "Could not load shared report.",
    );
  });
});
