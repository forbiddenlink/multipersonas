import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, getProject, updateProject, revalidatePath } = vi.hoisted(() => ({
  getUser: vi.fn(), getProject: vi.fn(), updateProject: vi.fn(), revalidatePath: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser } }) }));
vi.mock("@/lib/projects", () => ({ getProject, updateProject }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
import { saveProjectTaskAction } from "@/app/(app)/projects/actions";

function fields(goal: string, text: string): FormData {
  const data = new FormData();
  data.set("goal", goal);
  data.set("successText", text);
  return data;
}
beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "owner" } } });
  getProject.mockResolvedValue({ id: "project-1", url: "https://example.com" });
  updateProject.mockResolvedValue({ id: "project-1" });
});

describe("saving a project task", () => {
  it("saves a normalized task through the caller's scoped client", async () => {
    await expect(saveProjectTaskAction("project-1", fields(" Find contact information ", " Contact our team ")))
      .rejects.toThrow("redirect:/projects/project-1");
    expect(updateProject).toHaveBeenCalledWith(expect.objectContaining({ auth: expect.anything() }), "project-1", {
      task_definition: { version: 1, goal: "Find contact information", successText: "Contact our team" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/projects/project-1");
  });
  it("clears the task only when both fields are empty", async () => {
    await expect(saveProjectTaskAction("project-1", fields("", ""))).rejects.toThrow("redirect:/projects/project-1");
    expect(updateProject).toHaveBeenCalledWith(expect.anything(), "project-1", { task_definition: null });
  });
  it("rejects a partially entered task without updating it", async () => {
    await expect(saveProjectTaskAction("project-1", fields("Find contact information", ""))).rejects.toThrow("Enter%20a%20task");
    expect(updateProject).not.toHaveBeenCalled();
  });
  it("requires sign-in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(saveProjectTaskAction("project-1", fields("Find contact information", "Contact"))).rejects.toThrow("/auth/login");
    expect(updateProject).not.toHaveBeenCalled();
  });
  it("reports a missing or other-owner project without claiming a save", async () => {
    updateProject.mockResolvedValue(null);
    await expect(saveProjectTaskAction("project-1", fields("Find contact information", "Contact"))).rejects.toThrow("Project%20not%20found");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

it("saves optional destination and new-text checks as version 2", async () => {
  const data = fields("Find contact information", "Contact our team");
  data.set("expectedUrl", "https://EXAMPLE.com:443/contact");
  data.set("requireNewText", "on");
  await expect(saveProjectTaskAction("project-1", data)).rejects.toThrow("redirect:/projects/project-1");
  expect(updateProject).toHaveBeenCalledWith(expect.anything(), "project-1", {
    task_definition: { version: 2, goal: "Find contact information", successText: "Contact our team", expectedUrl: "https://example.com/contact", requireNewText: true },
  });
});
it.each(["javascript:alert(1)", "https://user:password@example.com", "broken"])("rejects invalid destination %s without saving", async (url) => {
  const data = fields("Find contact information", "Contact our team");
  data.set("expectedUrl", url);
  await expect(saveProjectTaskAction("project-1", data)).rejects.toThrow("Enter%20a%20task");
  expect(updateProject).not.toHaveBeenCalled();
});

it("rejects a destination outside the caller-owned project's origin", async () => {
  const data = fields("Find contact information", "Contact our team");
  data.set("expectedUrl", "https://other.example/contact");
  await expect(saveProjectTaskAction("project-1", data)).rejects.toThrow("same%20protocol");
  expect(updateProject).not.toHaveBeenCalled();
});
it("does not expose another owner's project while checking the destination", async () => {
  getProject.mockResolvedValue(null);
  const data = fields("Find contact information", "Contact our team");
  data.set("expectedUrl", "https://example.com/contact");
  await expect(saveProjectTaskAction("project-1", data)).rejects.toThrow("Project%20not%20found");
  expect(updateProject).not.toHaveBeenCalled();
});
