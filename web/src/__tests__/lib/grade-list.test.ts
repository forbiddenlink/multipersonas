import { beforeEach, describe, expect, it, vi } from "vitest";
import { listGraderScansForUser } from "@/lib/grade";

const { eq } = vi.hoisted(() => {
  const eq = vi.fn();
  return { eq };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq,
        order: () => ({
          limit: async () => ({
            data: [
              {
                token: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                entry_url: "https://example.com/",
                status: "completed",
                report: { grade: "B" },
                created_at: "2026-09-13T00:00:00.000Z",
              },
            ],
          }),
        }),
      }),
    }),
  }),
}));

describe("listGraderScansForUser", () => {
  beforeEach(() => {
    eq.mockReturnValue({
      order: () => ({
        limit: async () => ({
          data: [
            {
              token: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              entry_url: "https://example.com/",
              status: "completed",
              report: { grade: "B" },
              created_at: "2026-09-13T00:00:00.000Z",
            },
          ],
        }),
      }),
    });
  });

  it("returns dashboard rows for the owner, with a letter from the report", async () => {
    await expect(listGraderScansForUser("user-1")).resolves.toEqual([
      {
        token: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        entry_url: "https://example.com/",
        status: "completed",
        letter: "B",
        created_at: "2026-09-13T00:00:00.000Z",
      },
    ]);
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
  });
});
