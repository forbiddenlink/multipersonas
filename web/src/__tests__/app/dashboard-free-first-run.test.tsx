import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  grades: [] as { token: string; entry_url: string; status: string; letter: string | null; created_at: string }[],
  projects: [] as { id: string; name: string; url: string }[],
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) } }) }));
vi.mock("@/lib/audits", () => ({ listAudits: async () => [] }));
vi.mock("@/lib/projects", () => ({ listProjects: async () => state.projects }));
vi.mock("@/lib/entitlements", () => ({ getSessionPlan: async () => "free", planAllowsPersonas: () => false }));
vi.mock("@/lib/grade", () => ({ listGraderScansForUser: async () => state.grades }));
vi.mock("@/components/audit-form", () => ({ AuditForm: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import DashboardPage from "@/app/(app)/dashboard/page";

afterEach(() => {
  cleanup();
  state.grades = [];
  state.projects = [];
});

const grade = (token: string, url: string) => ({ token, entry_url: url, status: "completed", letter: "C", created_at: "2026-10-01T00:00:00Z" });

it("shows a brand-new Free user the three-step checklist with real links", async () => {
  render(await DashboardPage());
  const steps = screen.getAllByRole("listitem").filter((li) => /Done|To do/.test(li.textContent ?? ""));
  expect(steps).toHaveLength(3);
  expect(steps.map((li) => li.textContent?.includes("To do"))).toEqual([true, true, true]);
  expect(screen.getByRole("link", { name: "Grade a site" })).toHaveAttribute("href", "/grade");
});

it("marks steps done from the account's own grades and projects", async () => {
  state.grades = [grade("a", "https://acme.test/"), grade("b", "https://www.acme.test/x")];
  state.projects = [{ id: "p1", name: "Acme", url: "https://acme.test/" }];
  render(await DashboardPage());
  const steps = screen.getAllByRole("listitem").filter((li) => /Done|To do/.test(li.textContent ?? ""));
  expect(steps.map((li) => li.textContent?.includes("Done"))).toEqual([true, true, true]);
});

it("offers the paste-a-grade-link form to the dashboard", async () => {
  render(await DashboardPage());
  expect(screen.getByLabelText("Grade link")).toBeInTheDocument();
  expect(screen.getByText(/Have a grade link\? Paste it to save it to your account/)).toBeInTheDocument();
});

it("has exactly one filled primary link in the Free first-run view", async () => {
  const { container } = render(await DashboardPage());
  const filled = [...container.querySelectorAll("a, button")].filter((el) => el.className.includes("bg-primary"));
  expect(filled).toHaveLength(1);
});
