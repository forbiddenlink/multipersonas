import { afterEach, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readScanArtifact } from "./scan-artifact.js";

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

function setup(): { root: string; outside: string } {
  const root = mkdtempSync(join(tmpdir(), "worker-artifact-"));
  const outside = mkdtempSync(join(tmpdir(), "worker-outside-"));
  dirs.push(root, outside);
  mkdirSync(join(root, "screenshots"));
  writeFileSync(join(root, "screenshots", "step-001.png"), "frame");
  writeFileSync(join(outside, "secret"), "synthetic-service-role-key");
  return { root, outside };
}

it("reads a screenshot inside the job's output directory", () => {
  const { root } = setup();
  expect(readScanArtifact(root, join(root, "screenshots", "step-001.png"))?.toString()).toBe("frame");
});

it("refuses paths a compromised scan could use to make the worker read its own secrets (SEC-001)", () => {
  const { root, outside } = setup();
  // A reported path outside the job: the worker would read and upload it as a "screenshot".
  expect(readScanArtifact(root, join(outside, "secret"))).toBeNull();
  expect(readScanArtifact(root, join(root, "..", outside.split("/").pop()!, "secret"))).toBeNull();
  if (process.platform === "linux") expect(readScanArtifact(root, "/proc/self/environ")).toBeNull();
  // A symlink planted inside the output directory, at the file and at a parent directory.
  symlinkSync(join(outside, "secret"), join(root, "screenshots", "step-002.png"));
  expect(readScanArtifact(root, join(root, "screenshots", "step-002.png"))).toBeNull();
  symlinkSync(outside, join(root, "linked"));
  expect(readScanArtifact(root, join(root, "linked", "secret"))).toBeNull();
  // Not a regular file, and a missing one.
  expect(readScanArtifact(root, join(root, "screenshots"))).toBeNull();
  expect(readScanArtifact(root, join(root, "screenshots", "missing.png"))).toBeNull();
});

it("does not hang on a FIFO planted in place of a screenshot", () => {
  const { root } = setup();
  const fifo = join(root, "screenshots", "step-003.png");
  execFileSync("mkfifo", [fifo]);
  expect(readScanArtifact(root, fifo)).toBeNull();
});
