import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const plan = vi.hoisted(() => ({ value: "free" as string }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } }),
}));
vi.mock("@/lib/entitlements", async (orig) => ({
  ...(await orig<typeof import("@/lib/entitlements")>()),
  getSessionPlan: async () => plan.value,
}));
vi.mock("@/components/persona-filter", () => ({ PersonaFilter: () => null }));
vi.mock("@/components/persona-card", () => ({ PersonaCard: () => null }));
import PersonasPage from "@/app/(app)/personas/page";

afterEach(cleanup);

async function renderPage() {
  render(await PersonasPage({ searchParams: Promise.resolve({}) }));
}

describe("Personas page primary action", () => {
  it("sends a Free account to the free grade, which it can actually run", async () => {
    plan.value = "free";
    await renderPage();
    expect(screen.getByRole("link", { name: /grade a site free/i })).toHaveAttribute("href", "/grade");
    expect(screen.queryByRole("link", { name: /run an audit/i })).not.toBeInTheDocument();
  });

  it("keeps Run an audit for a paid account", async () => {
    plan.value = "pro";
    await renderPage();
    expect(screen.getByRole("link", { name: /run an audit/i })).toHaveAttribute("href", "/dashboard");
  });
});
