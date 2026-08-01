import { describe, it, expect, vi } from "vitest";
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from "@/lib/projects";

interface QueryResult {
  data: unknown;
  error: { message: string } | null;
}

/** Minimal chainable fake for the subset of the supabase-js query builder that
 * lib/projects.ts uses. Every chain method returns the same builder (so any call
 * order resolves), and the builder itself is thenable so `await` on an unresolved
 * chain (no `.single()`) works exactly like the real client. */
function makeQuery(result: QueryResult) {
  const calls: Record<string, unknown[]> = {};
  const builder = {
    select: vi.fn((...args: unknown[]) => {
      calls.select = args;
      return builder;
    }),
    order: vi.fn((...args: unknown[]) => {
      calls.order = args;
      return builder;
    }),
    eq: vi.fn((...args: unknown[]) => {
      calls.eq = args;
      return builder;
    }),
    insert: vi.fn((...args: unknown[]) => {
      calls.insert = args;
      return builder;
    }),
    update: vi.fn((...args: unknown[]) => {
      calls.update = args;
      return builder;
    }),
    delete: vi.fn((...args: unknown[]) => {
      calls.delete = args;
      return builder;
    }),
    single: vi.fn(() => builder),
    then(onFulfilled: (r: QueryResult) => unknown, onRejected?: (e: unknown) => unknown) {
      return Promise.resolve(result).then(onFulfilled, onRejected);
    },
    calls,
  };
  return builder;
}

function makeSupabase(result: QueryResult) {
  const query = makeQuery(result);
  const from = vi.fn(() => query);
  return { from, query };
}

describe("listProjects", () => {
  it("returns rows ordered newest-first", async () => {
    const rows = [
      { id: "1", name: "A", url: "https://a.com", description: null, created_at: "t1", updated_at: "t1" },
    ];
    const supabase = makeSupabase({ data: rows, error: null });
    const result = await listProjects(supabase as never);
    expect(result).toEqual(rows);
    expect(supabase.from).toHaveBeenCalledWith("projects");
    expect(supabase.query.calls.order).toEqual(["created_at", { ascending: false }]);
  });

  it("returns an empty array when data is null", async () => {
    const supabase = makeSupabase({ data: null, error: null });
    const result = await listProjects(supabase as never);
    expect(result).toEqual([]);
  });
});

describe("getProject", () => {
  it("returns the project when found", async () => {
    const row = {
      id: "p1",
      user_id: "u1",
      name: "A",
      url: "https://a.com",
      description: null,
      created_at: "t1",
      updated_at: "t1",
    };
    const supabase = makeSupabase({ data: row, error: null });
    const result = await getProject(supabase as never, "p1");
    expect(result).toEqual(row);
    expect(supabase.query.calls.eq).toEqual(["id", "p1"]);
  });

  it("returns null when missing or not owned (RLS)", async () => {
    const supabase = makeSupabase({ data: null, error: { message: "no rows" } });
    const result = await getProject(supabase as never, "missing");
    expect(result).toBeNull();
  });
});

describe("createProject", () => {
  it("inserts a row scoped to the given user id", async () => {
    const row = {
      id: "p1",
      user_id: "u1",
      name: "Acme",
      url: "https://acme.com",
      description: null,
      created_at: "t1",
      updated_at: "t1",
    };
    const supabase = makeSupabase({ data: row, error: null });
    const result = await createProject(supabase as never, "u1", {
      name: "Acme",
      url: "https://acme.com",
    });
    expect(result).toEqual(row);
    expect(supabase.query.calls.insert![0]).toEqual({
      user_id: "u1",
      name: "Acme",
      url: "https://acme.com",
      description: null,
    });
  });

  it("throws when the insert fails", async () => {
    const supabase = makeSupabase({ data: null, error: { message: "insert failed" } });
    await expect(
      createProject(supabase as never, "u1", { name: "Acme", url: "https://acme.com" }),
    ).rejects.toThrow("insert failed");
  });
});

describe("updateProject", () => {
  it("sends only the provided fields", async () => {
    const row = {
      id: "p1",
      user_id: "u1",
      name: "New name",
      url: "https://acme.com",
      description: null,
      created_at: "t1",
      updated_at: "t2",
    };
    const supabase = makeSupabase({ data: row, error: null });
    const result = await updateProject(supabase as never, "p1", { name: "New name" });
    expect(result).toEqual(row);
    expect(supabase.query.calls.update).toEqual([{ name: "New name" }]);
    expect(supabase.query.calls.eq).toEqual(["id", "p1"]);
  });

  it("throws when the update fails", async () => {
    const supabase = makeSupabase({ data: null, error: { message: "update failed" } });
    await expect(
      updateProject(supabase as never, "p1", { name: "New name" }),
    ).rejects.toThrow("update failed");
  });
});

describe("deleteProject", () => {
  it("deletes the row by id", async () => {
    const supabase = makeSupabase({ data: null, error: null });
    await deleteProject(supabase as never, "p1");
    expect(supabase.query.calls.delete).toEqual([]);
    expect(supabase.query.calls.eq).toEqual(["id", "p1"]);
  });

  it("throws when RLS blocks the delete", async () => {
    const supabase = makeSupabase({ data: null, error: { message: "denied" } });
    await expect(deleteProject(supabase as never, "p1")).rejects.toThrow("denied");
  });
});
