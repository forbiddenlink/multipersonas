import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { crawl } from "./crawler/crawl.js";
import { evaluateGate, baselineFromFindings, type Baseline } from "./crawler/gate.js";
import { loadSuppressions } from "./crawler/suppressions.js";
import { buildScanJson, type ScanJson } from "./report/json.js";
import { resolveSessionFile } from "./auth/session.js";
import { SEVERITIES, type Severity } from "./domain/vocab.js";

/**
 * MCP server: the deterministic scan and baseline gate, callable from a coding agent.
 *
 * Same engine and same guards as `personaudit scan`: the SSRF check runs on every
 * navigation, a session file is passed by path and never read into the model's
 * context, and nothing here calls a model. It runs locally over stdio, so
 * `allowPrivate` (scan your own dev server) is the CLI's choice to offer, never the
 * hosted service's.
 */

/** Defects returned per call. The rest are counted, not dropped silently. */
export const MAX_DEFECTS = 50;

export interface McpScanResult {
  target: string;
  axeCoreVersion: string;
  gate: { failOn: Severity; passed: boolean; failing: number } | null;
  summary: ScanJson["summary"];
  states: { scanned: number; skipped: number; brokenLinks: ScanJson["states"]["brokenLinks"] };
  /** New defects first, then worst first. Capped at MAX_DEFECTS. */
  defects: ScanJson["defects"];
  defectsOmitted: number;
  fixed: string[];
  expiredSuppressions: ScanJson["suppressions"]["expired"];
  note: string;
}

const RANK: Record<Severity, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 };

export function toMcpResult(scan: ScanJson, gate: { failOn: Severity; passed: boolean; failing: number } | null): McpScanResult {
  const ordered = [...scan.defects].sort(
    (a, b) => Number(b.isNew) - Number(a.isNew) || RANK[a.impact] - RANK[b.impact],
  );
  return {
    target: scan.target,
    axeCoreVersion: scan.axeCoreVersion,
    gate,
    summary: scan.summary,
    states: { scanned: scan.states.scanned.length, skipped: scan.states.skipped.length, brokenLinks: scan.states.brokenLinks ?? [] },
    defects: ordered.slice(0, MAX_DEFECTS),
    defectsOmitted: Math.max(0, ordered.length - MAX_DEFECTS),
    fixed: scan.fixed,
    expiredSuppressions: scan.suppressions.expired,
    note: "axe-core findings only. Automated checks find some accessibility barriers, not all; this is not a conformance verdict.",
  };
}

/** Baseline files are read and written only inside the directory the server was started in. */
export function resolveWorkspacePath(file: string, root: string = process.cwd()): string {
  const resolved = path.resolve(root, file);
  const rel = path.relative(root, resolved);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`${file} is outside the working directory ${root}`);
  }
  if (path.extname(resolved) !== ".json") throw new Error(`${file} must be a .json file`);
  return resolved;
}

export function readBaseline(file: string): Baseline | null {
  if (!fs.existsSync(file)) return null;
  const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
  const keys = (parsed as { keys?: unknown }).keys;
  if (!Array.isArray(keys) || !keys.every((k) => typeof k === "string")) {
    throw new Error(`${file} is not a Personaudit baseline (expected a "keys" string array)`);
  }
  return parsed as Baseline;
}

const scanInput = {
  url: z.string().describe("Page to start the crawl from. Same-origin links are followed."),
  maxPages: z.number().int().min(1).max(100).optional().describe("States to crawl. Default 20."),
  session: z.string().optional().describe("Path to a session file saved with `personaudit auth`, to scan behind a login. Passed by path; its contents never enter this conversation."),
  allowPrivate: z.boolean().optional().describe("Allow localhost and private-network targets, for your own dev server. Default false."),
};

function text(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function failure(error: unknown) {
  return { content: [{ type: "text" as const, text: error instanceof Error ? error.message : String(error) }], isError: true };
}

async function runScan(input: { url: string; maxPages?: number; session?: string; allowPrivate?: boolean }) {
  const sessionFile = input.session ? resolveSessionFile(input.session) : undefined;
  return crawl(input.url, { sessionFile, maxPages: input.maxPages ?? 20, allowPrivate: input.allowPrivate ?? false });
}

export function createServer(version: string): McpServer {
  const server = new McpServer({ name: "personaudit", version });

  server.registerTool(
    "scan_site",
    {
      title: "Scan a site for accessibility defects",
      description:
        "Crawl a site and run axe-core on every state reached. Deterministic, no AI. With `baseline`, each defect is marked new or known and `fixed` lists baseline defects that are gone; with `failOn`, the result says whether the CI gate would pass (fails only on NEW defects at or above that severity). Use after a UI change to check it introduced no new accessibility defects.",
      inputSchema: {
        ...scanInput,
        baseline: z.string().optional().describe("Baseline JSON in the working directory, e.g. personaudit-baseline.json."),
        suppressions: z.string().optional().describe("Suppressions JSON (accepted defects with reason, owner, expiry)."),
        failOn: z.enum(SEVERITIES).optional().describe("Evaluate the CI gate at this severity."),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (input) => {
      try {
        const baselinePath = input.baseline ? resolveWorkspacePath(input.baseline) : undefined;
        const baseline = baselinePath ? readBaseline(baselinePath) : null;
        const suppressions = input.suppressions ? loadSuppressions(input.suppressions) : [];
        const result = await runScan(input);
        const gate = evaluateGate(result.findings, { failOn: input.failOn ?? "minor", baseline, suppressions });
        const scan = buildScanJson({
          url: input.url,
          version,
          findings: result.findings,
          pagesVisited: result.pagesVisited,
          skipped: result.skipped,
          brokenLinks: result.brokenLinks,
          baselineKeys: baseline ? new Set(baseline.keys) : null,
          baselinePath: input.baseline,
          fixed: gate.fixed,
          suppressions: gate.suppressions,
        });
        return text(toMcpResult(scan, input.failOn ? { failOn: input.failOn, passed: gate.passed, failing: gate.failing.length } : null));
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "update_baseline",
    {
      title: "Write the accessibility baseline",
      description:
        "Scan the site and overwrite the baseline file with every current defect, so later scans count only new ones. This accepts the current backlog: only call it when the user asks to reset the baseline.",
      inputSchema: {
        ...scanInput,
        baseline: z.string().optional().describe("Baseline JSON in the working directory. Default personaudit-baseline.json."),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async (input) => {
      try {
        const baselinePath = resolveWorkspacePath(input.baseline ?? "personaudit-baseline.json");
        const result = await runScan(input);
        const snapshot = baselineFromFindings(result.findings, { url: input.url, createdAt: new Date().toISOString() });
        fs.writeFileSync(baselinePath, JSON.stringify(snapshot, null, 2));
        return text({ baseline: baselinePath, defects: snapshot.keys.length, statesScanned: result.pagesVisited.length });
      } catch (error) {
        return failure(error);
      }
    },
  );

  return server;
}

export async function serveStdio(version: string): Promise<void> {
  await createServer(version).connect(new StdioServerTransport());
}
