import type { SupabaseClient } from "@supabase/supabase-js";
import type { GradeScanResult } from "personaudit/grader";
import { describe, expect, it, vi } from "vitest";
import { persistGradeResult, writeJobState } from "./job-write.js";

it("rejects failed queue persistence rather than acknowledging the transition", async () => {
  await expect(writeJobState(Promise.resolve({ error: { message: "database unavailable" } })))
    .rejects.toThrow("database unavailable");
});



const grade: GradeScanResult = {
  entryUrl: "https://public.example/",
  pagesVisited: ["https://public.example/"],
  skipped: ["https://public.example/unavailable"],
  report: {
    grade: "A", score: 100, pagesScanned: 1, totalViolations: 0,
    byImpact: { critical: 0, serious: 0, moderate: 0, minor: 0 },
    wcagAAViolations: 0, perPage: [{ url: "https://public.example/", score: 100, violations: 0 }], rules: [],
  },
};

function storageFixture(errors: (string | null)[] = [null, null, null]) {
  const writes: { table: string; value: Record<string, unknown>; filter?: unknown[] }[] = [];
  const from = vi.fn((table: string) => ({
    update: (value: Record<string, unknown>) => {
      const write = { table, value, filter: undefined as unknown[] | undefined };
      writes.push(write);
      return { eq: (...filter: unknown[]) => {
        write.filter = filter;
        return { select: () => ({ single: async () => {
          const message = errors.shift();
          return { error: message ? { message } : null };
        } }) };
      } };
    },
  }));
  return { client: { from } as unknown as SupabaseClient, writes };
}

describe("grade persistence", () => {
  it("stores the complete scan evidence with completion after saving the public result", async () => {
    const { client, writes } = storageFixture();
    await persistGradeResult(client, "job-synthetic", grade);
    expect(writes).toEqual([
      { table: "audit_jobs", filter: ["id", "job-synthetic"], value: { result: grade } },
      { table: "grader_scans", filter: ["job_id", "job-synthetic"], value: {
        report: grade.report, pages_visited: grade.pagesVisited, status: "completed", error: null,
      } },
      { table: "audit_jobs", filter: ["id", "job-synthetic"], value: {
        status: "completed", error: null, completed_at: expect.any(String),
      } },
    ]);
    expect((writes[0]?.value.result as GradeScanResult).skipped).toEqual(grade.skipped);
  });

  it("does not acknowledge completion when the public result cannot be persisted", async () => {
    const { client, writes } = storageFixture([null, "write failed"]);
    await expect(persistGradeResult(client, "job-synthetic", grade)).rejects.toThrow("write failed");
    expect(writes).toHaveLength(2);
  });

  it("rejects a failed completion transition even after results were saved", async () => {
    const { client } = storageFixture([null, null, "completion failed"]);
    await expect(persistGradeResult(client, "job-synthetic", grade)).rejects.toThrow("completion failed");
  });

  it("rejects failure to retain the engine result rather than reporting success", async () => {
    const { client } = storageFixture(["job write failed"]);
    await expect(persistGradeResult(client, "job-synthetic", grade)).rejects.toThrow("job write failed");
  });
});
