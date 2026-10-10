import * as fs from "node:fs";
import { buildCommentBody, upsertComment } from "./report/pr-comment.js";
import type { ScanJson } from "./report/json.js";

/**
 * Entry point for the GitHub Action's `comment: true` step: post or update the
 * sticky PR comment from scan.json. A failure here only warns, because a comment
 * the token cannot write (a fork PR gets a read-only token) must not turn a
 * passing gate red or hide the real gate result.
 */
async function main(): Promise<void> {
  const scanPath = process.argv[2];
  const { GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_EVENT_PATH, GITHUB_API_URL, MP_GATE_OUTCOME } = process.env;
  if (!scanPath || !fs.existsSync(scanPath)) throw new Error(`no scan.json at ${scanPath ?? "(no path given)"}`);
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY || !GITHUB_EVENT_PATH) throw new Error("GITHUB_TOKEN, GITHUB_REPOSITORY and GITHUB_EVENT_PATH are required");

  const event = JSON.parse(fs.readFileSync(GITHUB_EVENT_PATH, "utf8")) as { pull_request?: { number: number } };
  if (!event.pull_request) {
    console.log("Not a pull_request event; skipping the comment.");
    return;
  }
  const scan = JSON.parse(fs.readFileSync(scanPath, "utf8")) as ScanJson;
  const result = await upsertComment(
    { apiUrl: GITHUB_API_URL ?? "https://api.github.com", repo: GITHUB_REPOSITORY, pullNumber: event.pull_request.number, token: GITHUB_TOKEN },
    buildCommentBody(scan, MP_GATE_OUTCOME),
  );
  console.log(`PR comment ${result}.`);
}

main().catch((error) => {
  console.log(`::warning::Personaudit could not post the PR comment: ${error instanceof Error ? error.message : String(error)}`);
});
