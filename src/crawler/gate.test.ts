import { describe, it, expect } from "vitest";
import { evaluateGate, baselineFromFindings, severityAtLeast, type Severity } from "./gate.js";
import type { Finding } from "../agent/engine.js";

const f = (ruleId: string, target: string, severity: Severity = "critical"): Finding => ({
  severity, category: "accessibility", title: ruleId, description: "", recommendation: "",
  pageUrl: "https://x/", ruleId, target, seenOn: ["https://x/"],
});

describe("severityAtLeast", () => {
  it("orders severities correctly", () => {
    expect(severityAtLeast("critical", "serious")).toBe(true);
    expect(severityAtLeast("serious", "serious")).toBe(true);
    expect(severityAtLeast("moderate", "serious")).toBe(false);
    expect(severityAtLeast("minor", "critical")).toBe(false);
  });
});

describe("evaluateGate — fail only on new defects at/above threshold", () => {
  it("with no baseline, every current defect is new", () => {
    const g = evaluateGate([f("a", "1"), f("b", "2")], { failOn: "critical" });
    expect(g.newDefects).toHaveLength(2);
    expect(g.passed).toBe(false);
    expect(g.exitCode).toBe(2);
  });

  it("passes when all current defects are in the baseline", () => {
    const findings = [f("a", "1"), f("b", "2")];
    const baseline = baselineFromFindings(findings);
    const g = evaluateGate(findings, { failOn: "critical", baseline });
    expect(g.newDefects).toHaveLength(0);
    expect(g.passed).toBe(true);
    expect(g.exitCode).toBe(0);
  });

  it("fails on a NEW defect not in the baseline", () => {
    const baseline = baselineFromFindings([f("a", "1")]);
    const g = evaluateGate([f("a", "1"), f("b", "2")], { failOn: "critical", baseline });
    expect(g.failing.map((x) => x.ruleId)).toEqual(["b"]);
    expect(g.exitCode).toBe(2);
  });

  it("does not fail on a new defect BELOW the threshold", () => {
    const baseline = baselineFromFindings([f("a", "1")]);
    const g = evaluateGate([f("a", "1"), f("minorRule", "2", "minor")], { failOn: "serious", baseline });
    expect(g.newDefects).toHaveLength(1);
    expect(g.failing).toHaveLength(0);
    expect(g.passed).toBe(true);
  });

  it("reports fixed defects (in baseline, now gone) but never fails on them", () => {
    const baseline = baselineFromFindings([f("a", "1"), f("gone", "9")]);
    const g = evaluateGate([f("a", "1")], { failOn: "critical", baseline });
    expect(g.fixed).toContain("gone|9");
    expect(g.passed).toBe(true);
  });

  it("uses the stable defect key — a re-rendered random id is not a new defect", () => {
    // The whole point: #mantine-<rnd> churn must not read as a regression.
    const baseline = baselineFromFindings([f("aria", "#mantine-aaaaaa-target")]);
    const g = evaluateGate([f("aria", "#mantine-zzzzzz-target")], { failOn: "critical", baseline });
    expect(g.newDefects).toHaveLength(0);
    expect(g.passed).toBe(true);
  });
});

describe("baselineFromFindings", () => {
  it("dedupes and sorts keys", () => {
    const b = baselineFromFindings([f("a", "1"), f("a", "1"), f("b", "2")]);
    expect(b.keys).toEqual(["a|1", "b|2"]);
  });
});
