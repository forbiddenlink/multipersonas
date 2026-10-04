// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { listGraderScansForUser } from "@/lib/grade";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
const databaseFetch = vi.fn<typeof fetch>();
const scan = {
  token: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  entry_url: "https://example.invalid/",
  status: "completed",
  report: { grade: "B" },
  created_at: "2026-09-13T00:00:00.000Z",
};

beforeEach(() => {
  databaseFetch.mockReset();
  vi.mocked(createAdminClient).mockReturnValue(createClient<Database>(
    "https://grades.example.test", "synthetic-test-key",
    { global: { fetch: databaseFetch }, auth: { persistSession: false } },
  ));
});

describe("listGraderScansForUser", () => {
  it("returns owner-scoped legacy grades without a linked job", async () => {
    databaseFetch.mockResolvedValue(new Response(JSON.stringify([{ ...scan, audit_jobs: null }])));
    await expect(listGraderScansForUser("user-1")).resolves.toEqual([
      { ...scan, report: undefined, letter: "B" },
    ]);
    const query = new URL(String(databaseFetch.mock.calls[0]![0])).searchParams;
    expect(query.get("user_id")).toBe("eq.user-1");
    expect(query.get("limit")).toBe("20");
  });

  it.each(["queued", "running", "failed", "completed"])(
    "shows authoritative %s job status when the saved scan differs", async (status) => {
      databaseFetch.mockImplementation(async (input) => {
        const query = new URL(String(input)).searchParams;
        // A real relationship request is required; an unjoined read cannot see the job.
        const linked = query.get("select")?.includes("audit_jobs(status)");
        return new Response(JSON.stringify([{
          ...scan, status: "queued", ...(linked ? { audit_jobs: { status } } : {}),
        }]));
      });
      expect((await listGraderScansForUser("user-1"))[0]?.status).toBe(status);
    },
  );

  it("does not represent a database failure as an empty history", async () => {
    databaseFetch.mockResolvedValue(new Response(JSON.stringify({ message: "internal detail" }), { status: 503 }));
    await expect(listGraderScansForUser("user-1")).rejects.toThrow("Could not load saved grades.");
  });
});
