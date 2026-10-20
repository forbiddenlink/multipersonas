import { afterEach, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createScanOutputDir, isolationProbeFailures, runJobProcess, scanChildEnv, ScanCleanupError, scanEnv,
  scanIsolationFromEnv, scanLaunch, type ScanIsolation,
} from "./job-process.js";

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

const isolation: ScanIsolation = { uid: 1001, gid: 999, home: "/home/pwuser" };

it("reads the scan identity, and refuses to run unisolated when isolation is required", () => {
  expect(scanIsolationFromEnv({})).toBeNull();
  expect(() => scanIsolationFromEnv({ AUDIT_REQUIRE_SCAN_ISOLATION: "1" })).toThrow(/AUDIT_SCAN_UID/);
  expect(scanIsolationFromEnv({ AUDIT_SCAN_UID: "1001", AUDIT_SCAN_GID: "999", AUDIT_SCAN_HOME: "/home/pwuser" }))
    .toEqual(isolation);
  // Root, names, and partial config are errors, never a fallback to the worker's own uid.
  expect(() => scanIsolationFromEnv({ AUDIT_SCAN_UID: "0", AUDIT_SCAN_GID: "999", AUDIT_SCAN_HOME: "/h" })).toThrow(/AUDIT_SCAN_UID/);
  expect(() => scanIsolationFromEnv({ AUDIT_SCAN_UID: "pwuser", AUDIT_SCAN_GID: "999", AUDIT_SCAN_HOME: "/h" })).toThrow(/AUDIT_SCAN_UID/);
  expect(() => scanIsolationFromEnv({ AUDIT_SCAN_UID: "1001", AUDIT_SCAN_HOME: "/h" })).toThrow(/AUDIT_SCAN_GID/);
  expect(() => scanIsolationFromEnv({ AUDIT_SCAN_UID: "1001", AUDIT_SCAN_GID: "999" })).toThrow(/AUDIT_SCAN_HOME/);
});

it("starts an isolated scan through setpriv with no capabilities and no_new_privs", () => {
  const launch = scanLaunch(isolation, "linux");
  expect(launch.execPath).toBe("setpriv");
  expect(launch.execArgv.slice(0, 9)).toEqual([
    "--reuid=1001", "--regid=999", "--clear-groups", "--inh-caps=-all", "--ambient-caps=-all", "--no-new-privs", "--",
    "python3", expect.stringMatching(/scan-supervisor\.py$/),
  ]);
  expect(launch.execArgv.slice(9)).toEqual([process.execPath, "--import", "tsx"]);
  expect(scanLaunch(null, "linux").execPath).toBe("python3");
  expect(() => scanLaunch(isolation, "darwin")).toThrow(/requires Linux/);
});

it("gives the isolated scan its own HOME and none of the worker's credentials", () => {
  const env = scanEnv(isolation, {
    PATH: "/usr/bin", HOME: "/home/mpworker", ANTHROPIC_API_KEY: "model-key",
    SUPABASE_SERVICE_ROLE_KEY: "service", SUPABASE_URL: "https://x.invalid", SENTRY_DSN: "dsn",
  });
  expect(env).toEqual({ PATH: "/usr/bin", HOME: "/home/pwuser", ANTHROPIC_API_KEY: "model-key" });
});

it("accepts the isolation probe only for a capability-free, different uid that cannot read the worker", () => {
  const good = "1001\nCapPrm:\t0000000000000000\nCapEff:\t0000000000000000\nCapAmb:\t0000000000000000\nNoNewPrivs:\t1\nenviron:denied\n";
  expect(isolationProbeFailures(good, isolation, 998)).toEqual([]);
  expect(isolationProbeFailures(good.replace("1001", "998"), { ...isolation, uid: 998 }, 998).join()).toMatch(/can read the worker/);
  expect(isolationProbeFailures(good.replace("CapEff:\t0000000000000000", "CapEff:\t00000000000000c0"), isolation, 998).join())
    .toMatch(/CapEff/);
  expect(isolationProbeFailures(good.replace("NoNewPrivs:\t1", "NoNewPrivs:\t0"), isolation, 998).join()).toMatch(/no_new_privs/);
  expect(isolationProbeFailures(good.replace("environ:denied", "environ:readable"), isolation, 998).join()).toMatch(/environ/);
  expect(isolationProbeFailures("", isolation, 998).length).toBeGreaterThan(0);
});

it("creates a fresh private output dir, shared with the scan group only under isolation", () => {
  const plain = createScanOutputDir(join(tmpdir(), "worker-out-"), null);
  dirs.push(plain);
  expect(statSync(plain).mode & 0o7777).toBe(0o700);
  const gid = process.getgid?.();
  if (gid === undefined) return;
  const shared = createScanOutputDir(join(tmpdir(), "worker-out-"), { ...isolation, gid });
  dirs.push(shared);
  expect(statSync(shared).gid).toBe(gid);
  expect(statSync(shared).mode & 0o7777).toBe(0o2770);
});
