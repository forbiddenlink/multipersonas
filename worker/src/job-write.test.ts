import type { SupabaseClient } from "@supabase/supabase-js";
import type { GradeScanResult } from "personaudit/grader";
import { describe, expect, it, vi } from "vitest";
import { persistGradeResult, saveHistoryRun, withRunId, writeJobState } from "./job-write.js";

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

describe("withRunId", () => {
  it("adds the saved run id so the browser can link to the run", () => {
    expect(withRunId({ url: "https://a.example" }, "run-1")).toEqual({ url: "https://a.example", runId: "run-1" });
  });

  it("leaves anonymous results untouched", () => {
    const response = { url: "https://a.example" };
    expect(withRunId(response, null)).toBe(response);
  });
});


describe("history persistence", () => {
  function historyFixture(findingError: string | null = null, completionError: string | null = null, cleanupError: string | null = null) {
    const statuses: string[] = [];
    const from = vi.fn((table: string) => ({
      insert: async () => ({ error: findingError ? { message: findingError } : null }),
      update: (value: { status: string }) => {
        expect(table).toBe("test_runs");
        statuses.push(value.status);
        const query = {
          eq: vi.fn(() => query),
          select: () => ({ single: async () => {
            const message = value.status === "failed" ? cleanupError : completionError;
            return { data: message ? null : { id: "run-1" }, error: message ? { message } : null };
          } }),
        };
        return query;
      },
    }));
    return { client: { from } as unknown as SupabaseClient, statuses, from };
  }

  it("marks a saved history run failed when findings cannot be saved", async () => {
    const { client, statuses } = historyFixture("findings unavailable");
    await expect(saveHistoryRun(client, "run-1", [{ title: "synthetic finding" }]))
      .rejects.toThrow("findings unavailable");
    expect(statuses).toEqual(["failed"]);
  });

  it("marks history failed when completion cannot be persisted", async () => {
    const { client, statuses } = historyFixture(null, "completion unavailable");
    await expect(saveHistoryRun(client, "run-1", [])).rejects.toThrow("completion unavailable");
    expect(statuses).toEqual(["completed", "failed"]);
  });

  it("does not mark a successful audit failed", async () => {
    const { client, statuses, from } = historyFixture();
    await saveHistoryRun(client, "run-1", []);
    expect(statuses).toEqual(["completed"]);
    expect(from).not.toHaveBeenCalledWith("findings");
  });

  it("retains both failures when the failed status cannot be saved either", async () => {
    const { client } = historyFixture("findings unavailable", null, "cleanup unavailable");
    const failure = await saveHistoryRun(client, "run-1", [{ title: "synthetic finding" }]).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).errors.map((error: Error) => error.message))
      .toEqual(["History findings persistence failed: findings unavailable", "History failure persistence failed: cleanup unavailable"]);
  });
});
