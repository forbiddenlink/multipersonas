import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectLimitError } from "@/lib/project-limit";

const { getUser, createProject, count } = vi.hoisted(() => ({
  getUser: vi.fn(), createProject: vi.fn(), count: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser },
    from: () => ({ select: () => ({ eq: async () => count() }) }),
  }),
}));
vi.mock("@/lib/projects", () => ({ createProject, updateProject: vi.fn(), deleteProject: vi.fn(), getProject: vi.fn() }));
vi.mock("@/lib/entitlements", () => ({
  getExactPlan: async () => "free",
  getSessionPlan: async () => "free",
  planAllowsPersonas: () => false,
  projectLimitFor: () => 1,
}));
vi.mock("@/lib/analytics-server", () => ({ captureServerEvent: async () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
import { createProjectAction } from "@/app/(app)/projects/actions";

function form(): FormData {
  const data = new FormData();
  data.set("name", "Acme");
  data.set("url", "https://acme.test");
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "owner" } } });
  count.mockReturnValue({ count: 0, error: null });
});

describe("createProjectAction at the plan cap", () => {
  it("shows the limit message when the pre-check passes but the database refuses", async () => {
    createProject.mockRejectedValue(new ProjectLimitError(1));
    await expect(createProjectAction(form())).rejects.toThrow(
      `redirect:/projects?error=${encodeURIComponent("Your plan includes 1 project. See pricing to add more.")}`,
    );
  });

  it("keeps the generic message for any other insert failure", async () => {
    createProject.mockRejectedValue(new Error("boom"));
    await expect(createProjectAction(form())).rejects.toThrow(
      `redirect:/projects?error=${encodeURIComponent("Could not create the project.")}`,
    );
  });
});
