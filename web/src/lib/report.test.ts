import { describe, it, expect } from "vitest";
import { assembleReport, type FindingRow } from "./report";

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
