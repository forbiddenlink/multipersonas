import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  createAdminClient: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mocks.getUser } })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: (...args: unknown[]) => mocks.createAdminClient(...args),
}));

vi.mock("@/lib/admin-access", () => ({
  isAdminEmail: (email: string | null | undefined) => email === "owner@example.com",
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

describe("setWaitlistLeadStatusAction", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { email: "owner@example.com" } } });
    mocks.eq.mockResolvedValue({ error: null });
    mocks.update.mockReturnValue({ eq: mocks.eq });
    mocks.from.mockReturnValue({ update: mocks.update });
    mocks.createAdminClient.mockReturnValue({ from: mocks.from });
  });

  function form(email: string, status: string): FormData {
    const data = new FormData();
    data.set("email", email);
    data.set("status", status);
    return data;
  }

  it("rejects a non-owner before creating a service-role client", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { email: "member@example.com" } } });
    const { setWaitlistLeadStatusAction } = await import("@/app/(app)/waitlist/actions");

    await expect(setWaitlistLeadStatusAction(form("lead@example.com", "contacted"))).rejects.toThrow(
      "redirect:/dashboard",
    );
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects an invalid status before a database write", async () => {
    const { setWaitlistLeadStatusAction } = await import("@/app/(app)/waitlist/actions");

    await expect(setWaitlistLeadStatusAction(form("lead@example.com", "delete"))).rejects.toThrow(
      "redirect:/waitlist?error=invalid-lead-update",
    );
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("updates only the selected lead with a normalized email", async () => {
    const { setWaitlistLeadStatusAction } = await import("@/app/(app)/waitlist/actions");

    await expect(setWaitlistLeadStatusAction(form(" Lead@Example.com ", "qualified"))).rejects.toThrow(
      "redirect:/waitlist",
    );
    expect(mocks.from).toHaveBeenCalledWith("waitlist");
    expect(mocks.update).toHaveBeenCalledWith({ follow_up_status: "qualified" });
    expect(mocks.eq).toHaveBeenCalledWith("email", "lead@example.com");
  });
});
