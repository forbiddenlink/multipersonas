import { afterEach, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runJobProcess, ScanCleanupError } from "./job-process.js";

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

it("stops timed-out scan work before returning failure", async () => {
  const dir = mkdtempSync(join(tmpdir(), "worker-timeout-"));
  dirs.push(dir);
  const script = join(dir, "hung.cjs");
  const marker = join(dir, "ticks");
  writeFileSync(script, `const fs = require('node:fs'); process.on('message', () => { fs.writeFileSync(${JSON.stringify(marker)}, 'started'); setInterval(() => fs.appendFileSync(${JSON.stringify(marker)}, '.'), 10); });`);
  await expect(runJobProcess(script, {}, 1500)).rejects.toThrow(/exceeded/);
  const stopped = readFileSync(marker, "utf8");
  await new Promise((resolve) => setTimeout(resolve, 80));
  expect(readFileSync(marker, "utf8")).toBe(stopped);
});

it("terminates browser descendants even in a separate process group", async () => {
  const dir = mkdtempSync(join(tmpdir(), "worker-tree-"));
  dirs.push(dir);
  const script = join(dir, "scan.cjs");
  const marker = join(dir, "browser");
  const browser = `const fs = require('node:fs'); fs.writeFileSync(${JSON.stringify(marker)}, 'started'); setInterval(() => fs.appendFileSync(${JSON.stringify(marker)}, '.'), 10);`;
  writeFileSync(script, `process.on('message', () => { require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(browser)}], { detached: true, stdio: 'ignore' }); });`);
  await expect(runJobProcess(script, {}, 1500)).rejects.toThrow(/exceeded/);
  const stopped = readFileSync(marker, "utf8");
  await new Promise((resolve) => setTimeout(resolve, 80));
  expect(readFileSync(marker, "utf8")).toBe(stopped);
});

it("returns a successful scan result", async () => {
  const dir = mkdtempSync(join(tmpdir(), "worker-result-"));
  dirs.push(dir);
  const script = join(dir, "scan.cjs");
  writeFileSync(script, `process.on('message', () => process.send({ result: { pages: 3 } }));`);
  await expect(runJobProcess(script, {}, 3000)).resolves.toEqual({ pages: 3 });
});

it("reports scan errors and unexpected exits", async () => {
  const dir = mkdtempSync(join(tmpdir(), "worker-error-"));
  dirs.push(dir);
  const script = join(dir, "scan.cjs");
  writeFileSync(script, `process.on('message', () => process.send({ error: 'navigation failed' }));`);
  await expect(runJobProcess(script, {}, 3000)).rejects.toThrow('navigation failed');
  writeFileSync(script, `process.on('message', () => process.exit(1));`);
  await expect(runJobProcess(script, {}, 3000)).rejects.toThrow('without a result');
});

it("rejects malformed scan output instead of accepting an empty success", async () => {
  const dir = mkdtempSync(join(tmpdir(), "worker-invalid-"));
  dirs.push(dir);
  const script = join(dir, "scan.cjs");
  writeFileSync(script, `process.on('message', () => process.send({ unexpected: true }));`);
  await expect(runJobProcess(script, {}, 3000)).rejects.toThrow('Invalid scan result');
});

it("rejects with a fatal cleanup error if teardown cannot be verified", async () => {
  const dir = mkdtempSync(join(tmpdir(), "worker-cleanup-"));
  dirs.push(dir);
  const script = join(dir, "scan.cjs");
  writeFileSync(script, `process.on('message', () => process.send({ result: { pages: 3 } }));`);
  writeFileSync(join(dir, "ps"), "#!/bin/sh\nexit 1\n", { mode: 0o755 });
  const previousPath = process.env.PATH;
  process.env.PATH = `${dir}:${previousPath}`;
  try {
    await expect(runJobProcess(script, {}, 3000)).rejects.toBeInstanceOf(ScanCleanupError);
  } finally { process.env.PATH = previousPath; }
});
