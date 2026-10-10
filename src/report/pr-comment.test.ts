import { describe, it, expect } from "vitest";
import { buildCommentBody, upsertComment, COMMENT_MARKER, type GithubTarget } from "./pr-comment.js";
import { buildScanJson, type ScanJson } from "./json.js";
import type { Finding } from "../agent/engine.js";

const f = (ruleId: string, target: string, severity: Finding["severity"]): Finding => ({
  severity, category: "accessibility", title: `${ruleId} help`, description: "", recommendation: "",
  pageUrl: "https://x/", ruleId, target, seenOn: ["https://x/"],
});

const scan = (findings: Finding[], over: Partial<Parameters<typeof buildScanJson>[0]> = {}): ScanJson =>
  buildScanJson({ url: "https://x/", version: "1", findings, pagesVisited: ["https://x/"], skipped: [], baselineKeys: new Set(["old|1"]), fixed: ["gone|1"], ...over });

describe("buildCommentBody", () => {
  it("starts with the marker and shows the counts", () => {
    const body = buildCommentBody(scan([f("a", "1", "serious"), f("old", "1", "minor")]), "failure");
    expect(body.startsWith(COMMENT_MARKER)).toBe(true);
    expect(body).toContain("**Gate failed.**");
    expect(body).toContain("| 1 | 1 | 1 | 0 | 0 |");
  });

  it("lists at most five new defects, worst first", () => {
    const findings = [...Array.from({ length: 6 }, (_, i) => f(`m${i}`, `${i}`, "minor")), f("crit", "c", "critical")];
    const body = buildCommentBody(scan(findings, { baselineKeys: null }));
    const bullets = body.split("\n").filter((l) => l.startsWith("- "));
    expect(bullets).toHaveLength(5);
    expect(bullets[0]).toContain("critical: `crit`");
    expect(body).toContain("(5 of 7)");
  });

  it("names expired suppressions and neutralizes backticks and pipes in selectors", () => {
    const body = buildCommentBody(
      scan([f("a", "x`|y", "serious")], {
        baselineKeys: null,
        suppressions: { active: [], unmatched: [], expired: [{ key: "k|1", reason: "r", owner: "ana", expires: "2026-01-01" }] },
      }),
    );
    expect(body).toContain("`k\\|1`, owner ana, expired 2026-01-01");
    expect(body).toContain("`x'\\|y`");
  });

  it("never claims compliance and uses no em dashes", () => {
    const body = buildCommentBody(scan([f("a", "1", "serious")]), "success");
    expect(body).not.toMatch(/complian/i);
    expect(body).not.toContain("—");
  });
});

const bot = { login: "github-actions[bot]", type: "Bot" };

function fakeFetch(existing: { id: number; body: string; user?: { login: string; type: string } }[][]) {
  const calls: { method: string; url: string; body?: string }[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    const method = init.method ?? "GET";
    calls.push({ method, url, body: init.body as string | undefined });
    const page = Number(new URL(url).searchParams.get("page") ?? 1);
    const payload = method === "GET" ? (existing[page - 1] ?? []) : {};
    return { ok: true, status: 200, json: async () => payload } as Response;
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const target: GithubTarget = { apiUrl: "https://api.github.com", repo: "o/r", pullNumber: 7, token: "t" };

describe("upsertComment", () => {
  it("creates a comment when none carries the marker", async () => {
    const { impl, calls } = fakeFetch([[{ id: 1, body: "unrelated" }]]);
    expect(await upsertComment(target, `${COMMENT_MARKER}\nhi`, impl)).toBe("created");
    expect(calls.map((c) => c.method)).toEqual(["GET", "POST"]);
    expect(calls[1]?.url).toBe("https://api.github.com/repos/o/r/issues/7/comments");
  });

  it("updates the marked comment instead of adding a second one", async () => {
    const { impl, calls } = fakeFetch([[{ id: 1, body: "x" }, { id: 42, body: `${COMMENT_MARKER}\nold`, user: bot }]]);
    expect(await upsertComment(target, `${COMMENT_MARKER}\nnew`, impl)).toBe("updated");
    expect(calls.at(-1)).toMatchObject({ method: "PATCH", url: "https://api.github.com/repos/o/r/issues/comments/42" });
  });

  it("finds the marker on a later page", async () => {
    const full = Array.from({ length: 100 }, (_, i) => ({ id: i, body: "x" }));
    const { impl, calls } = fakeFetch([full, [{ id: 500, body: COMMENT_MARKER, user: bot }]]);
    expect(await upsertComment(target, COMMENT_MARKER, impl)).toBe("updated");
    expect(calls.filter((c) => c.method === "GET")).toHaveLength(2);
  });

  it("ignores a human comment that carries the marker and posts a new one", async () => {
    const human = { login: "mallory", type: "User" };
    const { impl, calls } = fakeFetch([[{ id: 9, body: `${COMMENT_MARKER}\nmine`, user: human }]]);
    expect(await upsertComment(target, COMMENT_MARKER, impl)).toBe("created");
    expect(calls.map((c) => c.method)).toEqual(["GET", "POST"]);
  });

  it("ignores a different bot unless it is the configured author", async () => {
    const other = { login: "other-app[bot]", type: "Bot" };
    const page = [[{ id: 9, body: COMMENT_MARKER, user: other }]];
    expect(await upsertComment(target, COMMENT_MARKER, fakeFetch(page).impl)).toBe("created");
    expect(await upsertComment({ ...target, author: "other-app[bot]" }, COMMENT_MARKER, fakeFetch(page).impl)).toBe("updated");
  });
});
