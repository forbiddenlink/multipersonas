import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { spawnSync } from "child_process";
import { toMcpResult, resolveWorkspacePath, readBaseline, assertBaselineTarget, MAX_DEFECTS, createServer } from "./mcp.js";
import { SCAN_VIEW_URI } from "./mcp-app/scan-view.js";
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

describe("assertBaselineTarget", () => {
  it("allows a missing file or an existing baseline, and refuses any other JSON file untouched", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pa-mcp-"));
    expect(() => assertBaselineTarget(path.join(dir, "new.json"))).not.toThrow();
    const baseline = path.join(dir, "baseline.json");
    fs.writeFileSync(baseline, JSON.stringify({ keys: ["a|1"] }));
    expect(() => assertBaselineTarget(baseline)).not.toThrow();
    const pkg = path.join(dir, "package.json");
    const bytes = JSON.stringify({ name: "x", scripts: { test: "vitest" } });
    fs.writeFileSync(pkg, bytes);
    expect(() => assertBaselineTarget(pkg)).toThrow(/not a Personaudit baseline/);
    expect(fs.readFileSync(pkg, "utf8")).toBe(bytes);
  });
});

describe("createServer as an MCP App", () => {
  const connect = async () => {
    const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
    const { InMemoryTransport } = await import("@modelcontextprotocol/sdk/inMemory.js");
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await createServer("test").connect(serverSide);
    const client = new Client({ name: "test", version: "1" });
    await client.connect(clientSide);
    return client;
  };

  it("links scan_site to its panel and serves the panel as an MCP App resource", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    const scan = tools.find((t) => t.name === "scan_site");
    expect(scan?._meta).toMatchObject({ ui: { resourceUri: SCAN_VIEW_URI } });
    expect(scan?.annotations?.readOnlyHint).toBe(true);
    expect(tools.find((t) => t.name === "update_baseline")?._meta).toBeUndefined();

    const { contents } = await client.readResource({ uri: SCAN_VIEW_URI });
    const html = (contents[0] as { text: string; mimeType: string });
    expect(html.mimeType).toBe("text/html;profile=mcp-app");
    expect(html.text).toMatch(/^<!doctype html>/);
    const script = html.text.slice(html.text.indexOf('<script type="module">') + 22, html.text.lastIndexOf("</script>"));
    expect(script).not.toMatch(/<\/script/i);
    expect(script).not.toMatch(/innerHTML|insertAdjacentHTML|document\.write/);
    // The runtime and the view share one module script: a name clash is a SyntaxError that
    // leaves the panel blank. Parse it as a module, the way the host iframe does.
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pa-view-")), "view.mjs");
    fs.writeFileSync(file, script);
    const check = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    expect(check.stderr).toBe("");
    expect(check.status).toBe(0);
  });
});
