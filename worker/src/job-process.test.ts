import { afterEach, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runJobProcess, scanChildEnv, ScanCleanupError } from "./job-process.js";

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

// Linux-excluded on purpose. This case asserts the terminateTree() throw path, which
// only runs when the child is forked directly. On Linux runJobProcess instead wraps the
// child in scan-supervisor.py, and that supervisor owns descendant cleanup and reports
// its own failure through exit code 70 (handled separately in the close handler). Stubbing
// ps to exit 1 therefore breaks the supervisor's teardown rather than terminateTree's, and
// the child never closes, so the case hangs instead of rejecting. Measured 2026-09-05: it
// timed out at BOTH the 5000ms default and a 20000ms budget, which is what ruled out the
// "not enough headroom" explanation. Passes on macOS, 6/6.
it.skipIf(process.platform === "linux")("rejects with a fatal cleanup error if teardown cannot be verified", async () => {
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

it("passes the scan child only allowlisted environment variables", () => {
  const env = scanChildEnv({
    PATH: "/usr/bin", HOME: "/home/pwuser", LANG: "C.UTF-8", LC_ALL: "C", TZ: "UTC",
    ANTHROPIC_API_KEY: "model-key", PERSONAUDIT_MODEL: "m",
    AUDIT_BROWSER_PROXY: "http://127.0.0.1:4750", AUDIT_REQUIRE_EGRESS_PROXY: "1",
    MP_BLOCK_DESTRUCTIVE_ACTIONS: "1", PLAYWRIGHT_BROWSERS_PATH: "/ms-playwright",
    HTTPS_PROXY: "http://proxy:3128", NODE_ENV: "production",
    SUPABASE_SERVICE_ROLE_KEY: "service", SUPABASE_URL: "https://x.invalid",
    NEXT_PUBLIC_SUPABASE_URL: "https://x.invalid", WORKER_ALERT_WEBHOOK: "https://hook.invalid",
    SENTRY_DSN: "dsn", STRIPE_SECRET_KEY: "sk", RESEND_API_KEY: "re", CRON_SECRET: "c",
    RAILWAY_TOKEN: "t", DATABASE_URL: "postgres://u:p@h/db", SOMETHING_ELSE: "x",
  });
  expect(Object.keys(env).sort()).toEqual([
    "ANTHROPIC_API_KEY", "AUDIT_BROWSER_PROXY", "AUDIT_REQUIRE_EGRESS_PROXY", "HOME", "HTTPS_PROXY",
    "LANG", "LC_ALL", "MP_BLOCK_DESTRUCTIVE_ACTIONS", "NODE_ENV", "PATH", "PERSONAUDIT_MODEL",
    "PLAYWRIGHT_BROWSERS_PATH", "TZ",
  ]);
});

it("does not hand the database key to the real scan child", async () => {
  const dir = mkdtempSync(join(tmpdir(), "worker-env-"));
  dirs.push(dir);
  const script = join(dir, "scan.cjs");
  writeFileSync(script, `process.on('message', () => process.send({ result: Object.keys(process.env) }));`);
  const secrets = {
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-service", WORKER_ALERT_WEBHOOK: "https://hook.invalid",
    STRIPE_SECRET_KEY: "synthetic-stripe", SENTRY_DSN: "synthetic-dsn", DATABASE_URL: "synthetic-url",
  };
  Object.assign(process.env, secrets, { ANTHROPIC_API_KEY: "synthetic-model" });
  try {
    const keys = await runJobProcess<string[]>(script, {}, 5000);
    for (const name of Object.keys(secrets)) expect(keys).not.toContain(name);
    expect(keys).toContain("ANTHROPIC_API_KEY");
    expect(keys).toContain("PATH");
  } finally {
    for (const name of [...Object.keys(secrets), "ANTHROPIC_API_KEY"]) delete process.env[name];
  }
});
