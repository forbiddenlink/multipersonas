import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, it } from "vitest";
import { assertScanIsolation, createScanOutputDir, runJobProcess, scanIsolationFromEnv } from "./job-process.js";

// SEC-001 container check. Runs only inside the worker image, started through its real
// entrypoint so the uids, groups, and capabilities are the deployed ones:
//   docker run --rm -e MP_SCAN_ISOLATION_TESTS=1 -e SUPABASE_SERVICE_ROLE_KEY=<canary> <image> \
//     /usr/local/bin/entrypoint.sh pnpm exec vitest run worker/src/scan-isolation.container.test.ts
// The canary stands in for the service-role key. The scan and a detached "browser" it starts
// (Chromium's position in the tree) each search every process they can see for it.
const enabled = process.env.MP_SCAN_ISOLATION_TESTS === "1";

const probe = String.raw`
const fs = require("node:fs");
function hunt(canary) {
  const hits = [];
  let readable = 0;
  for (const pid of fs.readdirSync("/proc").filter((name) => /^\d+$/.test(name))) {
    for (const file of ["environ", "cmdline", "mem"]) {
      try {
        const text = fs.readFileSync("/proc/" + pid + "/" + file, "latin1");
        readable += 1;
        if (text.includes(canary)) hits.push(pid + "/" + file);
      } catch {}
    }
  }
  const status = fs.readFileSync("/proc/self/status", "utf8");
  const field = (name) => (status.match(new RegExp("^" + name + ":\\s*(\\S+)", "m")) || [])[1];
  return {
    uid: process.getuid(), hits, readable, ownEnvHasKey: JSON.stringify(process.env).includes(canary),
    capEff: field("CapEff"), capPrm: field("CapPrm"), capAmb: field("CapAmb"), noNewPrivs: field("NoNewPrivs"),
  };
}
if (process.argv[2] === "browser") {
  // The canary arrives in a file, not argv, so the probe's own cmdline does not match itself.
  const dir = process.argv[3];
  fs.writeFileSync(dir + "/browser.json", JSON.stringify(hunt(fs.readFileSync(dir + "/canary", "utf8"))));
} else {
  process.on("message", ({ canary, outputDir }) => {
    fs.writeFileSync(outputDir + "/canary", canary);
    const out = outputDir + "/browser.json";
    const child = require("node:child_process").spawn(process.execPath, [__filename, "browser", outputDir], { detached: true, stdio: "ignore" });
    child.on("exit", () => {
      fs.mkdirSync(outputDir + "/screenshots/nested", { recursive: true });
      fs.writeFileSync(outputDir + "/screenshots/nested/step-001.png", "png");
      process.send({ result: { scan: hunt(canary), browser: JSON.parse(fs.readFileSync(out, "utf8")) } });
    });
  });
}
`;

interface Hunt {
  uid: number; hits: string[]; readable: number; ownEnvHasKey: boolean;
  capEff: string; capPrm: string; capAmb: string; noNewPrivs: string;
}

it.runIf(enabled)("the scan and its browser cannot read the service-role key from any process", async () => {
  const canary = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(canary, "start the container with a synthetic SUPABASE_SERVICE_ROLE_KEY").toBeTruthy();
  const isolation = scanIsolationFromEnv();
  expect(isolation).not.toBeNull();
  assertScanIsolation(isolation!);
  expect(process.getuid?.()).not.toBe(isolation!.uid);

  const outputDir = createScanOutputDir(join(tmpdir(), "mp-isolation-"), isolation);
  try {
    const script = join(outputDir, "probe.cjs");
    writeFileSync(script, probe, { mode: 0o640 });
    const result = await runJobProcess<{ scan: Hunt; browser: Hunt }>(script, { canary, outputDir }, 30_000, isolation);
    for (const actor of [result.scan, result.browser]) {
      expect(actor.uid).toBe(isolation!.uid);
      expect(actor.ownEnvHasKey).toBe(false);
      expect(actor.hits).toEqual([]);
      expect(actor.readable).toBeGreaterThan(0); // it did look: its own /proc entries are readable
      expect([actor.capEff, actor.capPrm, actor.capAmb]).toEqual(["0000000000000000", "0000000000000000", "0000000000000000"]);
      expect(actor.noNewPrivs).toBe("1");
    }
  } finally {
    // No force: the worker must be able to remove everything the scan wrote (umask 007, setgid dir).
    rmSync(outputDir, { recursive: true });
  }
}, 60_000);
