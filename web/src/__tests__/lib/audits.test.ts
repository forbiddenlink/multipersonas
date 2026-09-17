import { describe, expect, it, vi } from "vitest";
import { listAudits } from "@/lib/audits";

describe("listAudits", () => {
  it("only returns runs whose findings have finished persisting", async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    const supabase = { from: vi.fn(() => query) };

    await expect(listAudits(supabase as never)).resolves.toEqual([]);
    expect(query.eq).toHaveBeenCalledWith("status", "completed");
  });
});
