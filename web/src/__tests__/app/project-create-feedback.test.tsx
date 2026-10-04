import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/projects", () => ({ listProjects: async () => [] }));
vi.mock("@/app/(app)/projects/actions", () => ({ createProjectAction: vi.fn() }));
import ProjectsPage from "@/app/(app)/projects/page";

afterEach(cleanup);

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
