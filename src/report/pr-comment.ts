import { severityRank } from "../domain/vocab.js";
import type { ScanJson, ScanJsonDefect } from "./json.js";

/** Hidden marker that identifies the one comment this tool owns on a PR. */
export const COMMENT_MARKER = "<!-- personaudit-gate -->";

const TOP_NEW = 5;

/** Inline code that cannot be broken out of by a backtick or a table pipe in a selector. */
const code = (s: string) => `\`${s.replace(/`/g, "'").replace(/\|/g, "\\|")}\``;

/** Markdown body of the sticky comment, built from scan.json. `gateOutcome` is the gate step's outcome. */
export function buildCommentBody(scan: ScanJson, gateOutcome?: string): string {
  const { summary } = scan;
  const failed = gateOutcome === "failure";
  const lines = [COMMENT_MARKER, "## Personaudit accessibility gate", ""];
  lines.push(failed ? "**Gate failed.**" : gateOutcome === "success" ? "**Gate passed.**" : "**Gate result unknown.**");
  lines.push("");
  lines.push("| New | Fixed | Still open | Suppressed | Expired suppressions |");
  lines.push("|:---:|:---:|:---:|:---:|:---:|");
  lines.push(`| ${summary.new} | ${summary.fixed} | ${summary.stillOpen} | ${summary.suppressed} | ${summary.expired} |`);
  lines.push("");

  const topNew: ScanJsonDefect[] = scan.defects
    .filter((d) => d.isNew)
    .sort((a, b) => severityRank(a.impact) - severityRank(b.impact))
    .slice(0, TOP_NEW);
  if (topNew.length > 0) {
    lines.push(`**Top new defects** (${topNew.length} of ${summary.new})`, "");
    for (const d of topNew) {
      lines.push(`- ${d.impact}: ${code(d.ruleId)} on ${code(d.selector || d.states[0] || "page")}. ${d.help}`);
    }
    lines.push("");
  }

  if (scan.suppressions.expired.length > 0) {
    lines.push("**Expired suppressions** (defect still present)", "");
    for (const s of scan.suppressions.expired) lines.push(`- ${code(s.key)}, owner ${s.owner}, expired ${s.expires}`);
    lines.push("");
  }

  if (scan.states.skipped.length > 0) {
    lines.push(`> ${scan.states.skipped.length} more states were found but not scanned (page budget reached).`, "");
  }
  lines.push(
    `<sub>${scan.states.scanned.length} states scanned with axe-core ${scan.axeCoreVersion}. Automated checks find only some accessibility barriers.</sub>`,
  );
  return lines.join("\n");
}

export interface GithubTarget {
  apiUrl: string;
  repo: string;
  pullNumber: number;
  token: string;
}

type Fetch = typeof fetch;

async function gh(f: Fetch, t: GithubTarget, method: string, path: string, body?: unknown): Promise<unknown> {
  const res = await f(`${t.apiUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${t.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub API ${method} ${path} returned ${res.status}`);
  return res.json();
}

/** Create the comment, or update the one carrying the marker. Returns which happened. */
export async function upsertComment(t: GithubTarget, body: string, f: Fetch = fetch): Promise<"created" | "updated"> {
  const base = `/repos/${t.repo}/issues`;
  for (let page = 1; ; page++) {
    const batch = (await gh(f, t, "GET", `${base}/${t.pullNumber}/comments?per_page=100&page=${page}`)) as { id: number; body?: string }[];
    const existing = batch.find((c) => c.body?.includes(COMMENT_MARKER));
    if (existing) {
      await gh(f, t, "PATCH", `${base}/comments/${existing.id}`, { body });
      return "updated";
    }
    if (batch.length < 100) break;
  }
  await gh(f, t, "POST", `${base}/${t.pullNumber}/comments`, { body });
  return "created";
}
