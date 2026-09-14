import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, update, updateIn, updateIs, select } = vi.hoisted(() => {
  const select = vi.fn();
  const updateIs = vi.fn(() => ({ select }));
  const updateIn = vi.fn(() => ({ is: updateIs }));
  const update = vi.fn(() => ({ in: updateIn }));
  return { getUser: vi.fn(), update, updateIn, updateIs, select };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ update }),
  }),
}));

describe("POST /api/grade/claim", () => {
  const TOKEN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    select.mockResolvedValue({ data: [{ token: TOKEN }], error: null });
    const mod = await import("@/app/api/grade/claim/route");
    POST = mod.POST;
  });

  it("rejects unauthenticated callers", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(
      new Request("http://localhost/api/grade/claim", {
        method: "POST",
        body: JSON.stringify({ tokens: [TOKEN] }),
      }),
    );
    expect(res.status).toBe(401);
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects a non-object body", async () => {
    const res = await POST(
      new Request("http://localhost/api/grade/claim", { method: "POST", body: "null" }),
    );
    expect(res.status).toBe(400);
  });

  it("claims unowned tokens for the signed-in user", async () => {
    const res = await POST(
      new Request("http://localhost/api/grade/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens: [TOKEN, "nope"] }),
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ claimed: 1 });
    expect(update).toHaveBeenCalledWith({ user_id: "user-1" });
    expect(updateIn).toHaveBeenCalledWith("token", [TOKEN]);
    expect(updateIs).toHaveBeenCalledWith("user_id", null);
  });

  it("returns zero claimed when no valid tokens are sent", async () => {
    const res = await POST(
      new Request("http://localhost/api/grade/claim", {
        method: "POST",
        body: JSON.stringify({ tokens: ["nope"] }),
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ claimed: 0 });
    expect(update).not.toHaveBeenCalled();
  });
});
