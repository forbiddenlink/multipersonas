import { describe, it, expect, vi } from "vitest";
import { assembleReport, buildReport, type FindingRow } from "./report";

const run = {
  id: "run-1",
  url: "https://client.example",
  created_at: "2026-07-28T12:00:00Z",
  persona_ids: ["elderly-user", "power-user-developer"],
};

const row = (over: Partial<FindingRow>): FindingRow => ({
  id: "f",
  source: "axe",
  severity: "serious",
  title: "Elements must have sufficient color contrast",
  description: "d",
  recommendation: "r",
  rule_id: "color-contrast",
  wcag_tags: ["wcag2aa", "wcag143"],
  page_url: "https://client.example/checkout",
  ...over,
});

describe("assembleReport", () => {
  it("includes ONLY axe verdicts — persona findings never enter a compliance report", () => {
    const report = assembleReport(run, [
      row({ id: "a", source: "axe", title: "axe finding" }),
      row({ id: "p", source: "persona", title: "persona opinion" }),
    ]);
    expect(report.verdicts).toHaveLength(1);
    expect(report.verdicts[0]!.title).toBe("axe finding");
    expect(report.verdicts.some((v) => v.title === "persona opinion")).toBe(false);
  });

  it("cites WCAG success criteria from the finding's tags", () => {
    const report = assembleReport(run, [row({ wcag_tags: ["wcag143", "wcag2aa"] })]);
    expect(report.verdicts[0]!.criteria).toEqual([
      { code: "1.4.3", name: "Contrast (Minimum)" },
    ]);
  });

  it("counts violations by severity", () => {
    const report = assembleReport(run, [
      row({ id: "1", severity: "critical" }),
      row({ id: "2", severity: "critical" }),
      row({ id: "3", severity: "minor" }),
      row({ id: "4", source: "persona", severity: "critical" }), // excluded
    ]);
    expect(report.severityCounts).toEqual({
      critical: 2,
      serious: 0,
      moderate: 0,
      minor: 1,
    });
  });

  it("orders verdicts most-severe first", () => {
    const report = assembleReport(run, [
      row({ id: "1", severity: "minor" }),
      row({ id: "2", severity: "critical" }),
      row({ id: "3", severity: "moderate" }),
    ]);
    expect(report.verdicts.map((v) => v.severity)).toEqual([
      "critical",
      "moderate",
      "minor",
    ]);
  });

  it("carries run metadata for the report header", () => {
    const report = assembleReport(run, []);
    expect(report).toMatchObject({
      runId: "run-1",
      url: "https://client.example",
      auditDate: "2026-07-28T12:00:00Z",
      personaIds: ["elderly-user", "power-user-developer"],
      clientName: null,
      agencyName: null,
    });
    expect(report.verdicts).toEqual([]);
    expect(report.severityCounts).toEqual({
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0,
    });
  });

  it("splits per-state locations from a comma-joined page_url", () => {
    const report = assembleReport(run, [
      row({
        page_url: "https://app.example/cart, https://app.example/checkout",
      }),
    ]);
    expect(report.verdicts[0]!.locations).toEqual([
      "https://app.example/cart",
      "https://app.example/checkout",
    ]);
  });

  it("carries white-label branding when provided", () => {
    const report = assembleReport(run, [], {
      clientName: "Meridian Clinic",
      agencyName: "Northwind Agency",
    });
    expect(report.clientName).toBe("Meridian Clinic");
    expect(report.agencyName).toBe("Northwind Agency");
  });

  it("summarizes persona impact and raises priority when a blocked persona hits the verdict state", () => {
    const report = assembleReport(
      run,
      [row({ id: "blocked", severity: "serious" })],
      [
        {
          persona_id: "elderly-user",
          goal_completed: false,
          page_url: "https://client.example/checkout",
          step: 1,
        },
        {
          persona_id: "elderly-user",
          goal_completed: false,
          page_url: "https://client.example/checkout",
          step: 2,
        },
      ],
    );

    expect(report.personaImpact).toEqual([
      {
        personaId: "elderly-user",
        goalCompleted: false,
        steps: 2,
        verdictStates: 1,
        blockedVerdictStates: 1,
      },
    ]);
    expect(report.verdicts[0]).toMatchObject({
      priorityScore: 80,
      priorityReason: "1 blocked persona reached this state",
    });
  });

  it("groups axe verdicts into remediation clusters", () => {
    const report = assembleReport(run, [
      row({
        id: "contrast",
        rule_id: "color-contrast",
        title: "Elements must have sufficient color contrast",
        severity: "serious",
      }),
      row({
        id: "label",
        rule_id: "label",
        title: "Form elements must have labels",
        severity: "critical",
      }),
      row({
        id: "persona",
        source: "persona",
        rule_id: "label",
        title: "Persona opinion is not a verdict",
      }),
    ]);

    expect(report.fixClusters.map((c) => c.id)).toEqual(["labels", "contrast"]);
    expect(report.fixClusters[0]).toMatchObject({
      label: "Labels & form names",
      verdictCount: 1,
      severities: { critical: 1, serious: 0, moderate: 0, minor: 0 },
    });
  });
});

it("keeps the saved task in the report without treating absent text as a proven blockage", () => {
  const task = { version: 1, goal: "Find contact information", successText: "Contact our team" };
  const report = assembleReport({ ...run, task_definition: task }, [row({})], [{
    persona_id: "first-time-visitor", goal_completed: false,
    page_url: "https://client.example/checkout", step: 1,
  }]);
  expect(report.task).toEqual(task);
  expect(report.verdicts[0]?.priorityReason).not.toContain("blocked");
  expect(report.verdicts[0]?.priorityScore).toBe(65);
});


type QueryResult = { data: unknown; error: { message: string } | null; count?: number | null };
function reportClient(overrides: Record<string, QueryResult[]> = {}) {
  const replies: Record<string, QueryResult[]> = {
    test_runs: [{ data: run, error: null }],
    findings: [{ data: [], error: null, count: 0 }],
    journey_steps: [{ data: [], error: null, count: 0 }],
    ...overrides,
  };
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: vi.fn((table: string) => {
      const query: Record<string, unknown> = {};
      for (const method of ["select", "eq", "order", "range", "single", "maybeSingle"]) {
        query[method] = (...args: unknown[]) => { calls.push({ table, method, args }); return query; };
      }
      query.then = (resolve: (value: QueryResult) => unknown, reject: (error: unknown) => unknown) => {
        const reply = replies[table]?.shift();
        return reply ? Promise.resolve(reply).then(resolve, reject) : Promise.reject(new Error(`Unexpected query: ${table}`)).then(resolve, reject);
      };
      return query;
    }),
  };
  return { client: client as unknown as Parameters<typeof buildReport>[0], calls };
}

describe("buildReport evidence loading", () => {
  it.each(["findings", "journey_steps"])("rejects a failed %s read instead of printing an empty report", async (table) => {
    const { client } = reportClient({ [table]: [{ data: null, error: { message: "private database detail" } }] });
    await expect(buildReport(client, run.id)).rejects.toThrow("Could not load complete report evidence");
  });

  it("keeps a genuinely empty successful audit valid", async () => {
    const { client } = reportClient();
    expect((await buildReport(client, run.id))?.verdicts).toEqual([]);
  });

  it("distinguishes unavailable runs from missing or inaccessible runs", async () => {
    const missing = reportClient({ test_runs: [{ data: null, error: null }] });
    await expect(buildReport(missing.client, run.id)).resolves.toBeNull();
    expect(missing.calls.some((call) => call.table === "findings")).toBe(false);
    const unavailable = reportClient({ test_runs: [{ data: null, error: { message: "database unavailable" } }] });
    await expect(buildReport(unavailable.client, run.id)).rejects.toThrow("Could not load report");
  });

  it("loads beyond the server row limit, even if pages are smaller than requested", async () => {
    const findings = Array.from({ length: 1001 }, (_, index) => row({ id: `finding-${index}` }));
    const { client, calls } = reportClient({ findings: [
      { data: findings.slice(0, 500), count: 1001, error: null },
      { data: findings.slice(500, 1000), count: 1001, error: null },
      { data: findings.slice(1000), count: 1001, error: null },
    ] });
    expect((await buildReport(client, run.id))?.verdicts).toHaveLength(1001);
    expect(calls.filter((call) => call.table === "findings" && call.method === "range").map((call) => call.args[0])).toEqual([0, 500, 1000]);
    expect(calls).toContainEqual({ table: "findings", method: "order", args: ["id", { ascending: true }] });
    expect(calls.filter((call) => call.table === "findings" && call.method === "eq" && call.args[0] === "source")).toHaveLength(3);
  });

  it("loads all journey evidence rather than dropping later personas", async () => {
    const { client } = reportClient({ journey_steps: [
      { data: [{ persona_id: "first", goal_completed: true, page_url: run.url, step: 1 }], count: 2, error: null },
      { data: [{ persona_id: "second", goal_completed: false, page_url: run.url, step: 1 }], count: 2, error: null },
    ] });
    expect((await buildReport(client, run.id))?.personaImpact.map((item) => item.personaId)).toEqual(["first", "second"]);
  });

  it.each([
    { data: null, count: 1, error: null },
    { data: [], count: 1, error: null },
    { data: [], count: null, error: null },
  ])("rejects incomplete evidence even without a database error", async (reply) => {
    const { client } = reportClient({ findings: [reply] });
    await expect(buildReport(client, run.id)).rejects.toThrow("Could not load complete report evidence");
  });

  it.each([
    { data: null, count: null, error: { message: "private database detail" } },
    { data: [], count: 2, error: null },
    { data: [row({ id: "second" })], count: 3, error: null },
  ])("rejects a failed or changed later page rather than returning partial findings", async (reply) => {
    const { client } = reportClient({ findings: [
      { data: [row({ id: "first" })], count: 2, error: null }, reply,
    ] });
    await expect(buildReport(client, run.id)).rejects.toThrow("Could not load complete report evidence");
  });
});

it("exports persisted contextual evidence instead of inferring it from journey success", () => {
  const task = { version: 2, goal: "Find contact information", successText: "Contact our team", requireNewText: true };
  const outcomes = [{ personaId: "first-time-visitor", evidence: {
    status: "inconclusive", pageUrl: "https://example.invalid", stepIndex: null,
    checks: { text: "observed", url: "not-required", newText: "inconclusive" },
  } }];
  const report = assembleReport({ ...run, task_definition: task, task_outcomes: outcomes }, [], [{
    persona_id: "first-time-visitor", goal_completed: true, page_url: "https://example.invalid", step: 0,
  }]);
  expect(report.taskOutcomes).toEqual(outcomes);
  expect(assembleReport({ ...run, task_definition: task }, []).taskOutcomes).toEqual([]);
});
