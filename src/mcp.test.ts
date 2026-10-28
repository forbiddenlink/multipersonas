import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { toMcpResult, resolveWorkspacePath, readBaseline, MAX_DEFECTS } from "./mcp.js";
import { buildScanJson } from "./report/json.js";
import type { Finding } from "./agent/engine.js";

const f = (ruleId: string, target: string, severity: Finding["severity"]): Finding => ({
  severity, category: "accessibility", title: `${ruleId} help`, description: "", recommendation: "",
  pageUrl: "https://x/", ruleId, target, seenOn: ["https://x/"],
});

const scan = (findings: Finding[], baselineKeys: Set<string> | null = null) =>
  buildScanJson({ url: "https://x/", version: "1", findings, pagesVisited: ["https://x/"], skipped: [], baselineKeys, fixed: [] });

describe("toMcpResult", () => {
  it("puts new defects first, then the worst, and says how many it left out", () => {
    const known = f("known", "k", "critical");
    const many = Array.from({ length: MAX_DEFECTS + 3 }, (_, i) => f(`m${i}`, `${i}`, "minor"));
    const result = toMcpResult(scan([known, ...many, f("new-crit", "c", "critical")], new Set(["known|k"])), null);
    expect(result.defects).toHaveLength(MAX_DEFECTS);
    expect(result.defectsOmitted).toBe(5);
    expect(result.defects[0]?.ruleId).toBe("new-crit");
    expect(result.defects.find((d) => d.ruleId === "known")).toBeUndefined();
  });

  it("never reads as a conformance verdict", () => {
    const result = toMcpResult(scan([]), { failOn: "serious", passed: true, failing: 0 });
    expect(result.note).toMatch(/not a conformance verdict/);
    expect(JSON.stringify(result)).not.toMatch(/\bcompliant\b/i);
  });
});

describe("resolveWorkspacePath", () => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "pa-mcp-root-")));
  fs.mkdirSync(path.join(root, "ci"));

  it("accepts a JSON file inside the working directory", () => {
    expect(resolveWorkspacePath("ci/baseline.json", root)).toBe(path.join(root, "ci/baseline.json"));
  });

  it.each(["../escape.json", "/etc/passwd.json", "baseline.txt", "."])("refuses %s", (file) => {
    expect(() => resolveWorkspacePath(file, root)).toThrow();
  });

  it("refuses a symlinked file and a symlinked directory that lead outside", () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "pa-mcp-outside-"));
    fs.writeFileSync(path.join(outside, "target.json"), "{}");
    fs.symlinkSync(path.join(outside, "target.json"), path.join(root, "link.json"));
    fs.symlinkSync(outside, path.join(root, "linkdir"));
    expect(() => resolveWorkspacePath("link.json", root)).toThrow(/symlink/);
    expect(() => resolveWorkspacePath("linkdir/new.json", root)).toThrow(/outside/);
  });
});

describe("readBaseline", () => {
  it("returns null for a missing file and rejects a file that is not a baseline", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-mcp-"));
    expect(readBaseline(path.join(dir, "none.json"))).toBeNull();
    const bad = path.join(dir, "bad.json");
    fs.writeFileSync(bad, JSON.stringify({ keys: [1] }));
    expect(() => readBaseline(bad)).toThrow(/not a Personaudit baseline/);
    const good = path.join(dir, "good.json");
    fs.writeFileSync(good, JSON.stringify({ keys: ["a|1"] }));
    expect(readBaseline(good)?.keys).toEqual(["a|1"]);
  });
});
