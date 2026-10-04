import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) } }) }));
vi.mock("@/lib/projects", () => ({ getProject: async () => ({ id: "project-1", name: "Acme", url: "https://acme.test", task_definition: null }) }));
vi.mock("@/lib/audits", () => ({ listAudits: async () => [] }));
vi.mock("@/lib/baseline", () => ({ compareProjectRuns: async () => null }));
vi.mock("@/lib/entitlements", () => ({ getSessionPlan: async () => "free", planAllowsPersonas: () => false }));
vi.mock("@/lib/grade", () => ({
  listGraderScansForUser: async () => [
    { token: "t-acme", entry_url: "https://www.acme.test/", status: "complete", letter: "B", created_at: "2026-10-01T00:00:00Z" },
    { token: "t-other", entry_url: "https://other.test/", status: "complete", letter: "A", created_at: "2026-10-01T00:00:00Z" },
  ],
}));
vi.mock("@/app/(app)/projects/actions", () => ({ saveProjectTaskAction: vi.fn(), updateProjectAction: vi.fn(), deleteProjectAction: vi.fn(), upsertProjectScheduleAction: vi.fn() }));
vi.mock("@/components/audit-form", () => ({ AuditForm: () => null }));
vi.mock("@/components/audit-history", () => ({ AuditHistory: () => null }));
vi.mock("@/app/(app)/projects/delete-project-form", () => ({ DeleteProjectForm: () => null }));
import ProjectDetailPage from "@/app/(app)/projects/[id]/page";

afterEach(cleanup);

it("gives a Free project a prefilled free grade and lists this site's grades only", async () => {
  render(await ProjectDetailPage({ params: Promise.resolve({ id: "project-1" }), searchParams: Promise.resolve({}) }));
  expect(screen.getByRole("link", { name: "Grade this site free" })).toHaveAttribute("href", "/grade?url=https%3A%2F%2Facme.test");
  const section = screen.getByRole("region", { name: "Free grades of this site" });
  expect(within(section).getByText("www.acme.test")).toBeTruthy();
  expect(within(section).queryByText("other.test")).toBeNull();
});
