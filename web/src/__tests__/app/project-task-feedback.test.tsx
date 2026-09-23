import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) } }) }));
vi.mock("@/lib/projects", () => ({ getProject: async () => ({ id: "project-1", name: "Synthetic project", url: "https://example.invalid", task_definition: null }) }));
vi.mock("@/lib/audits", () => ({ listAudits: async () => [] }));
vi.mock("@/lib/baseline", () => ({ compareProjectRuns: async () => null }));
vi.mock("@/lib/entitlements", () => ({ getSessionPlan: async () => "free", planAllowsPersonas: () => false }));
vi.mock("@/app/(app)/projects/actions", () => ({ saveProjectTaskAction: vi.fn(), updateProjectAction: vi.fn(), deleteProjectAction: vi.fn(), upsertProjectScheduleAction: vi.fn() }));
vi.mock("@/components/audit-form", () => ({ AuditForm: () => null }));
vi.mock("@/components/audit-history", () => ({ AuditHistory: () => null }));
vi.mock("@/components/pro-audit-upsell", () => ({ ProAuditUpsell: () => null }));
vi.mock("@/app/(app)/projects/delete-project-form", () => ({ DeleteProjectForm: () => null }));
import ProjectDetailPage from "@/app/(app)/projects/[id]/page";
import { TASK_INPUT_ERROR, TASK_ORIGIN_ERROR } from "@/lib/tasks";

afterEach(cleanup);
it.each([TASK_INPUT_ERROR, TASK_ORIGIN_ERROR])("renders task rejection feedback: %s", async (error) => {
  render(await ProjectDetailPage({ params: Promise.resolve({ id: "project-1" }), searchParams: Promise.resolve({ error }) }));
  expect(screen.getByRole("alert")).toHaveTextContent(error);
  expect(screen.getByRole("alert").compareDocumentPosition(screen.getByLabelText("What should a visitor accomplish?")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
it("does not echo arbitrary URL parameters as application errors", async () => {
  render(await ProjectDetailPage({ params: Promise.resolve({ id: "project-1" }), searchParams: Promise.resolve({ error: "Untrusted message" }) }));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
