import { describe, expect, it, vi } from "vitest";
import { defectKey } from "@engine/agent/defect-key";
import {
  baselineFromFindings,
  evaluateGate,
} from "@engine/crawler/gate";
import { compareProjectRuns, rowToFinding, type AxeFindingRow } from "@/lib/baseline";

function row(partial: Partial<AxeFindingRow> & Pick<AxeFindingRow, "title">): AxeFindingRow {
  return {
    id: partial.id ?? "1",
    title: partial.title,
    severity: partial.severity ?? "serious",
    rule_id: partial.rule_id ?? "color-contrast",
    target: partial.target ?? "#btn",
    page_url: partial.page_url ?? "https://example.com",
    description: partial.description ?? "desc",
  };
}

describe("rowToFinding + gate (web baseline)", () => {
  it("maps DB rows into the same defectKey the CLI uses", () => {
    const f = rowToFinding(row({ title: "Contrast", rule_id: "color-contrast", target: "#submit" }));
    expect(defectKey(f)).toBe("color-contrast|#submit");
  });

  it("reports new and cleared defects across two runs", () => {
    const previous = [
      rowToFinding(row({ id: "a", title: "Contrast", rule_id: "color-contrast", target: "#a" })),
      rowToFinding(row({ id: "b", title: "Label", rule_id: "label", target: "#b" })),
    ];
    const current = [
      rowToFinding(row({ id: "a", title: "Contrast", rule_id: "color-contrast", target: "#a" })),
      rowToFinding(row({ id: "c", title: "Name", rule_id: "button-name", target: "#c" })),
    ];

    const baseline = baselineFromFindings(previous);
    const gate = evaluateGate(current, { failOn: "minor", baseline });

    expect(gate.newDefects.map((f) => f.ruleId)).toEqual(["button-name"]);
    expect(gate.fixed).toContain("label|#b");
    expect(gate.fixed).toHaveLength(1);
  });

  it("treats first run (no baseline) as all-new", () => {
    const current = [
      rowToFinding(row({ title: "Contrast", rule_id: "color-contrast", target: "#a" })),
    ];
    const gate = evaluateGate(current, { failOn: "minor", baseline: null });
    expect(gate.newDefects).toHaveLength(1);
    expect(gate.fixed).toHaveLength(0);
  });

  it("does not turn a failed findings query into a clean comparison", async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: null, error: { message: "database unavailable" } }).then(resolve),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    const supabase = { from: vi.fn(() => query) };

    await expect(compareProjectRuns(supabase as never, [{
      id: "run-1",
      url: "https://example.test",
      created_at: "2026-09-17T00:00:00.000Z",
      task_success_achieved: 1,
      task_success_total: 1,
      persona_ids: [],
    }])).rejects.toThrow("Could not load findings for run run-1: database unavailable");
  });
});
