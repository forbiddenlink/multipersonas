import { describe, expect, it, vi } from "vitest";
import { REPLAY_DELETE_FAILED, removeProjectReplayFiles } from "@/lib/replay-files";

interface Row {
  id: string;
  project_id?: string;
  test_run_id?: string;
  screenshot_path?: string | null;
}

function runId(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

function client(options: {
  runs: Row[];
  steps?: Row[];
  runPages?: Array<{ data: Row[] | null; error: { message: string } | null; count: number | null }>;
  removeError?: { message: string } | null;
  signed?: Array<{ signedUrl: string; error: string | null }>;
  signedError?: { message: string } | null;
  signedLength?: number;
}) {
  const removed: string[][] = [];
  const signedBatches: string[][] = [];
  const stepFilters: string[][] = [];
  let runPage = 0;
  let projectDeleted = false;

  function table(rows: Row[]) {
    let filtered = rows;
    let slice = rows;
    const builder = {
      select: () => builder,
      eq: (_column: string, value: string) => {
        filtered = rows.filter((row) => row.project_id === value);
        slice = filtered;
        return builder;
      },
      in: (_column: string, ids: string[]) => {
        stepFilters.push(ids);
        filtered = rows.filter((row) => row.test_run_id !== undefined && ids.includes(row.test_run_id));
        slice = filtered;
        return builder;
      },
      not: () => builder,
      order: () => builder,
      range: (from: number, to: number) => {
        slice = filtered.slice(from, to + 1);
        return builder;
      },
      delete: () => {
        projectDeleted = true;
        return builder;
      },
      then(onFulfilled: (value: unknown) => unknown) {
        return Promise.resolve({ data: slice, error: null, count: filtered.length }).then(onFulfilled);
      },
    };
    return builder;
  }

  const supabase = {
    from(tableName: string) {
      if (tableName === "test_runs" && options.runPages) {
        const page = options.runPages[runPage] ?? options.runPages[options.runPages.length - 1];
        runPage += 1;
        const builder = {
          select: () => builder,
          eq: () => builder,
          order: () => builder,
          range: () => builder,
          then(onFulfilled: (value: unknown) => unknown) {
            return Promise.resolve(page).then(onFulfilled);
          },
        };
        return builder;
      }
      if (tableName === "journey_steps") return table(options.steps ?? []);
      return table(options.runs);
    },
    storage: {
      from: () => ({
        remove: vi.fn(async (paths: string[]) => {
          removed.push(paths);
          return { data: paths, error: options.removeError ?? null };
        }),
        createSignedUrls: vi.fn(async (paths: string[]) => {
          signedBatches.push(paths);
          if (options.signedError) return { data: null, error: options.signedError };
          const data = (options.signed ?? paths.map(() => ({ signedUrl: "", error: "Object not found" }))).slice(
            0,
            options.signedLength ?? paths.length,
          );
          return { data, error: null };
        }),
      }),
    },
    removed,
    signedBatches,
    stepFilters,
    get projectDeleted() {
      return projectDeleted;
    },
  };
  return supabase;
}

describe("removeProjectReplayFiles", () => {
  it("does nothing to storage when the project has no runs", async () => {
    const supabase = client({ runs: [] });
    await removeProjectReplayFiles(supabase as never, "project-1");
    expect(supabase.removed).toEqual([]);
    expect(supabase.projectDeleted).toBe(false);
  });

  it("removes owned screenshots and confirms they are gone", async () => {
    const owned = runId(1);
    const path = `${owned}/keyboard-traversal/step-000.png`;
    const supabase = client({
      runs: [{ id: owned, project_id: "project-1" }],
      steps: [{ id: "step-1", test_run_id: owned, screenshot_path: path }],
    });
    await removeProjectReplayFiles(supabase as never, "project-1");
    expect(supabase.removed).toEqual([[path]]);
    expect(supabase.signedBatches).toEqual([[path]]);
  });

  it("deduplicates paths and removes them in batches of 100", async () => {
    const owned = runId(1);
    const steps = Array.from({ length: 101 }, (_, index) => ({
      id: `step-${index}`,
      test_run_id: owned,
      screenshot_path: `${owned}/keyboard-traversal/step-${String(index).padStart(3, "0")}.png`,
    }));
    steps.push({ ...steps[0]!, id: "duplicate" });
    const supabase = client({
      runs: [{ id: owned, project_id: "project-1" }],
      steps,
    });
    await removeProjectReplayFiles(supabase as never, "project-1");
    expect(supabase.removed.map((batch) => batch.length)).toEqual([100, 1]);
    expect(new Set(supabase.removed.flat()).size).toBe(101);
  });

  it("pages through more than 1000 runs before reading screenshots", async () => {
    const runs = Array.from({ length: 1001 }, (_, index) => ({
      id: runId(index + 1),
      project_id: "project-1",
    }));
    const supabase = client({ runs, steps: [] });
    await removeProjectReplayFiles(supabase as never, "project-1");
    expect(supabase.stepFilters.flat()).toHaveLength(1001);
    expect(supabase.removed).toEqual([]);
  });

  it("refuses a screenshot path outside the project's runs", async () => {
    const owned = runId(1);
    const supabase = client({
      runs: [{ id: owned, project_id: "project-1" }],
      steps: [{
        id: "step-1",
        test_run_id: owned,
        screenshot_path: `${runId(2)}/keyboard-traversal/step-000.png`,
      }],
    });
    await expect(removeProjectReplayFiles(supabase as never, "project-1")).rejects.toThrow(REPLAY_DELETE_FAILED);
    expect(supabase.removed).toEqual([]);
  });

  it("refuses path traversal and does not include the provider error", async () => {
    const owned = runId(1);
    const supabase = client({
      runs: [{ id: owned, project_id: "project-1" }],
      steps: [{ id: "step-1", test_run_id: owned, screenshot_path: `${owned}/../secrets.png` }],
    });
    await expect(removeProjectReplayFiles(supabase as never, "project-1")).rejects.toThrow(REPLAY_DELETE_FAILED);
    expect(supabase.removed).toEqual([]);
  });

  it("stops when storage removal fails", async () => {
    const owned = runId(1);
    const supabase = client({
      runs: [{ id: owned, project_id: "project-1" }],
      steps: [{ id: "step-1", test_run_id: owned, screenshot_path: `${owned}/persona/step-000.png` }],
      removeError: { message: "bucket password=secret" },
    });
    const error = await removeProjectReplayFiles(supabase as never, "project-1").catch((caught: unknown) => caught);
    expect(error).toEqual(new Error(REPLAY_DELETE_FAILED));
    expect(String(error)).not.toContain("secret");
  });

  it("stops when a screenshot is still readable after removal", async () => {
    const owned = runId(1);
    const path = `${owned}/persona/step-000.png`;
    const supabase = client({
      runs: [{ id: owned, project_id: "project-1" }],
      steps: [{ id: "step-1", test_run_id: owned, screenshot_path: path }],
      signed: [{ signedUrl: "https://storage.example/still-there", error: null }],
    });
    await expect(removeProjectReplayFiles(supabase as never, "project-1")).rejects.toThrow(REPLAY_DELETE_FAILED);
  });

  it("stops when the existence check is ambiguous", async () => {
    const owned = runId(1);
    const supabase = client({
      runs: [{ id: owned, project_id: "project-1" }],
      steps: [{ id: "step-1", test_run_id: owned, screenshot_path: `${owned}/persona/step-000.png` }],
      signed: [{ signedUrl: "", error: null }],
    });
    await expect(removeProjectReplayFiles(supabase as never, "project-1")).rejects.toThrow(REPLAY_DELETE_FAILED);
  });

  it.each(["Object not found", "The resource was not found", "not_found"])(
    "treats %s as a removed screenshot",
    async (error) => {
      const owned = runId(1);
      const supabase = client({
        runs: [{ id: owned, project_id: "project-1" }],
        steps: [{ id: "step-1", test_run_id: owned, screenshot_path: `${owned}/persona/step-000.png` }],
        signed: [{ signedUrl: "", error }],
      });
      await expect(removeProjectReplayFiles(supabase as never, "project-1")).resolves.toBeUndefined();
    },
  );

  it("stops when a run page changes length mid-read", async () => {
    const supabase = client({
      runs: [],
      runPages: [
        { data: [{ id: runId(1) }], error: null, count: 2 },
        { data: [], error: null, count: 1 },
      ],
    });
    await expect(removeProjectReplayFiles(supabase as never, "project-1")).rejects.toThrow(REPLAY_DELETE_FAILED);
    expect(supabase.removed).toEqual([]);
  });
});
