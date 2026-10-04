import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ projects: [] as { id: string; name: string; url: string; created_at: string }[], plan: "free" }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) } }) }));
vi.mock("@/lib/projects", () => ({ listProjects: async () => state.projects }));
vi.mock("@/lib/entitlements", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/entitlements")>()),
  getExactPlan: async () => state.plan,
}));
vi.mock("@/app/(app)/projects/actions", () => ({ createProjectAction: vi.fn() }));
import ProjectsPage from "@/app/(app)/projects/page";

afterEach(() => {
  cleanup();
  state.projects = [];
  state.plan = "free";
});

it.each([
  "Could not check your project allowance. Please try again.",
  "Your plan includes 1 project. See pricing to add more.",
  "Your plan includes 5 projects. See pricing to add more.",
])("shows the rejected project's recovery message: %s", async (error) => {
  render(await ProjectsPage({ searchParams: Promise.resolve({ error }) }));
  expect(screen.getByRole("alert")).toHaveTextContent(error);
});

it("does not display arbitrary messages from the URL", async () => {
  render(await ProjectsPage({ searchParams: Promise.resolve({ error: "Untrusted message" }) }));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

const saved = { id: "p1", name: "Acme", url: "https://acme.test/", created_at: "2026-10-01T00:00:00Z" };

it("turns a graded url into one primary button with the host in its name", async () => {
  render(await ProjectsPage({ searchParams: Promise.resolve({ url: "https://www.acme.test/pricing" }) }));
  const button = screen.getByRole("button", { name: "Create a project for www.acme.test" });
  const form = button.closest("form");
  expect(form?.querySelector('input[name="name"]')).toHaveValue("acme.test");
  expect(form?.querySelector('input[name="url"]')).toHaveValue("https://www.acme.test/pricing");
  // The manual form stays available but is not a second filled primary.
  expect(screen.getByRole("button", { name: "Create project" })).toBeInTheDocument();
});

it("says a Free plan is at its limit, links the existing project, and hides the create form", async () => {
  state.projects = [saved];
  render(await ProjectsPage({ searchParams: Promise.resolve({ url: "https://other.test/" }) }));
  expect(screen.getByRole("heading", { name: /Free plan is at its project limit/ })).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: "Acme" })[0]).toHaveAttribute("href", "/projects/p1");
  expect(screen.queryByRole("button", { name: /Create/ })).not.toBeInTheDocument();
});

it("does not hide the form for a plan with room", async () => {
  state.plan = "pro";
  state.projects = [saved];
  render(await ProjectsPage({ searchParams: Promise.resolve({ url: "https://other.test/" }) }));
  expect(screen.getByRole("button", { name: "Create a project for other.test" })).toBeInTheDocument();
});
