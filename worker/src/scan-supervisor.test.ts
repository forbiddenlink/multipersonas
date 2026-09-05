import { expect, it } from "vitest";
import { fork, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

it.skipIf(process.platform !== "linux")("reaps detached browser work after the scan crashes abruptly", async () => {
  const dir = mkdtempSync(join(tmpdir(), "worker-crash-"));
  try {
    const marker = join(dir, "browser");
    const script = join(dir, "crash.cjs");
    const browser = `const fs = require('node:fs'); fs.writeFileSync(${JSON.stringify(marker)}, 'started'); setInterval(() => fs.appendFileSync(${JSON.stringify(marker)}, '.'), 10);`;
    writeFileSync(script, `const cp = require('node:child_process'); const fs = require('node:fs'); cp.spawn(process.execPath, ['-e', ${JSON.stringify(browser)}], { detached: true, stdio: 'ignore' }); const t = setInterval(() => { if(fs.existsSync(${JSON.stringify(marker)})) { clearInterval(t); process.kill(process.pid, 'SIGKILL'); } }, 10);`);
    const supervisor = spawn("python3", [fileURLToPath(new URL("./scan-supervisor.py", import.meta.url)), process.execPath, script], { stdio: "ignore" });
    const code = await new Promise<number | null>((resolve, reject) => { supervisor.on("error", reject); supervisor.on("exit", resolve); });
    expect(code).not.toBe(0);
    const stopped = readFileSync(marker, "utf8");
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(readFileSync(marker, "utf8")).toBe(stopped);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

it.skipIf(process.platform !== "linux")("preserves the scan IPC channel through the supervisor", async () => {
  const dir = mkdtempSync(join(tmpdir(), "worker-ipc-"));
  try {
    const script = join(dir, "scan.cjs");
    writeFileSync(script, `process.on('message', input => process.send({ result: input }, () => process.disconnect()));`);
    const child = fork(script, [], {
      execPath: "python3",
      execArgv: [fileURLToPath(new URL("./scan-supervisor.py", import.meta.url)), process.execPath],
      serialization: "advanced", stdio: ["ignore", "ignore", "ignore", "ipc"],
    });
    let received: unknown;
    child.on("message", (value) => { received = value; });
    const exited = new Promise<number | null>((resolve, reject) => { child.on("error", reject); child.on("exit", resolve); });
    child.send({ pages: 3 });
    expect(await exited).toBe(0);
    expect(received).toEqual({ result: { pages: 3 } });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
