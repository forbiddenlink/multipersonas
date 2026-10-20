import { beforeEach, describe, expect, it, vi } from "vitest";

// Server actions are public POST endpoints: the proxy redirect does not protect them.
// Each must send a caller without a session to login before any read or write.

const mocks = vi.hoisted(() => {
  const calls: Array<[string, unknown[]]> = [];
  // A chainable stand-in for the Supabase query builder that records every call.
  const builder = (): Record<string, unknown> => {
    const self: Record<string, unknown> = {};
    for (const method of ["select", "update", "insert", "delete", "eq", "not", "is", "maybeSingle", "single"]) {
      self[method] = (...args: unknown[]) => {
        calls.push([method, args]);
        if (method === "maybeSingle" || method === "single") return Promise.resolve({ data: null, error: null });
        return self;
      };
    }
    self.then = (resolve: (value: unknown) => void) => resolve({ data: [{ id: "row" }], error: null });
    return self;
  };
  return {
    calls,
    getUser: vi.fn(),
    from: vi.fn((table: string) => {
      calls.push(["from", [table]]);
      return builder();
    }),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    getProject: vi.fn(),
    upsertProjectSchedule: vi.fn(),
    getExactPlan: vi.fn(),
    getSessionPlan: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser }, from: mocks.from }),
}));
vi.mock("@/lib/projects", () => ({
  createProject: mocks.createProject,
  updateProject: mocks.updateProject,
  deleteProject: mocks.deleteProject,
  getProject: mocks.getProject,
}));
vi.mock("@/lib/schedules", () => ({
  isScanInterval: () => true,
  upsertProjectSchedule: mocks.upsertProjectSchedule,
}));
vi.mock("@/lib/entitlements", () => ({
  getExactPlan: mocks.getExactPlan,
  getSessionPlan: mocks.getSessionPlan,
  planAllowsPersonas: () => true,
  planAllowsReportBranding: () => true,
  projectLimitFor: () => 10,
}));
vi.mock("@/lib/analytics-server", () => ({ captureServerEvent: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));

import {
  createProjectAction,
  deleteProjectAction,
  updateProjectAction,
  upsertProjectScheduleAction,
} from "@/app/(app)/projects/actions";
import { updateFindingWorkflowAction } from "@/app/(app)/audits/[id]/actions";
import { createShareLinkAction, revokeShareLinkAction } from "@/app/(app)/audits/[id]/report/share-actions";
import { updateAgencyNameAction } from "@/app/(app)/settings/actions";

const RUN_ID = "11111111-1111-4111-8111-111111111111";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const actions: Array<[string, () => Promise<void>]> = [
  ["createProjectAction", () => createProjectAction(form({ name: "Site", url: "https://example.com" }))],
  ["updateProjectAction", () => updateProjectAction("p1", form({ name: "Site", url: "https://example.com" }))],
  ["deleteProjectAction", () => deleteProjectAction("p1")],
  ["upsertProjectScheduleAction", () => upsertProjectScheduleAction("p1", form({ interval: "weekly", enabled: "on" }))],
  ["updateFindingWorkflowAction", () => updateFindingWorkflowAction(RUN_ID, "f1", form({ status: "resolved" }))],
  ["createShareLinkAction", () => createShareLinkAction(RUN_ID)],
  ["revokeShareLinkAction", () => revokeShareLinkAction(RUN_ID)],
  ["updateAgencyNameAction", () => updateAgencyNameAction(form({ agencyName: "Acme" }))],
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calls.length = 0;
});

describe.each([
  ["no session", { data: { user: null }, error: null }],
  ["an expired session", { data: { user: null }, error: { name: "AuthApiError", status: 401, message: "JWT expired" } }],
])("server actions with %s", (_label, session) => {
  it.each(actions)("%s redirects to login and reads or writes nothing", async (_name, run) => {
    mocks.getUser.mockResolvedValue(session);

    await expect(run()).rejects.toThrow(/redirect:\/auth\/login/);

    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.createProject).not.toHaveBeenCalled();
    expect(mocks.updateProject).not.toHaveBeenCalled();
    expect(mocks.deleteProject).not.toHaveBeenCalled();
    expect(mocks.upsertProjectSchedule).not.toHaveBeenCalled();
  });
});

describe("share links are scoped to the caller", () => {
  it.each([
    ["createShareLinkAction", () => createShareLinkAction(RUN_ID)],
    ["revokeShareLinkAction", () => revokeShareLinkAction(RUN_ID)],
  ])("%s filters every update by the signed-in user's id", async (_name, run) => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-1" } }, error: null });

    await expect(run()).rejects.toThrow(/redirect:/);

    const updateAt = mocks.calls.findIndex(([method]) => method === "update");
    expect(updateAt).toBeGreaterThan(-1);
    const afterUpdate = mocks.calls.slice(updateAt);
    expect(afterUpdate).toContainEqual(["eq", ["user_id", "owner-1"]]);
  });
});
