import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const seen = vi.hoisted(() => ({ props: null as Record<string, unknown> | null, plan: "pro" }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) } }) }));
vi.mock("@/lib/audits", () => ({ listAudits: async () => [] }));
vi.mock("@/lib/projects", () => ({ listProjects: async () => [{ id: "p1", name: "Acme", url: "https://acme.test/" }] }));
vi.mock("@/lib/entitlements", async () => {
  const actual = await vi.importActual<typeof import("@/lib/entitlements")>("@/lib/entitlements");
  return { ...actual, getSessionPlan: async () => seen.plan };
});
vi.mock("@/lib/grade", () => ({ listGraderScansForUser: async () => [] }));
vi.mock("@/components/audit-form", () => ({
  AuditForm: (props: Record<string, unknown>) => {
    seen.props = props;
    return null;
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import DashboardPage from "@/app/(app)/dashboard/page";

afterEach(cleanup);

it("gives a Solo dashboard form the project list and the plan's cap, so runs attach to a project", async () => {
  seen.plan = "pro";
  render(await DashboardPage());
  expect(seen.props?.projects).toEqual([{ id: "p1", name: "Acme", url: "https://acme.test/" }]);
  expect(seen.props?.projectLimit).toBe(5);
});

it("passes no cap for the Agency founding plan", async () => {
  seen.plan = "team";
  render(await DashboardPage());
  expect(seen.props?.projectLimit).toBeNull();
});
