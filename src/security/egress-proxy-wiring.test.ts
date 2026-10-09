import { describe, it, expect } from "vitest";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

// Guards the DNS-rebinding SSRF mitigation (docs/ssrf-egress-hardening.md) at the
// infra-file level. src/security/browser.ts's use of AUDIT_BROWSER_PROXY /
// AUDIT_REQUIRE_EGRESS_PROXY is only real protection if:
//   1. the worker image actually builds + ships the smokescreen binary,
//   2. the entrypoint backgrounds it before the worker starts, and
//   3. Railway's startCommand actually invokes that entrypoint (a bare
//      `pnpm --filter worker start` override would silently skip smokescreen
//      entirely and revert to a direct, unguarded browser launch).
// These are plain string checks on the infra files themselves — no Docker/Go
// toolchain needed to run this test, but it fails loudly if the wiring drifts.

const dockerfile = readFileSync(new URL("../../worker/Dockerfile", import.meta.url), "utf8");
const entrypoint = readFileSync(new URL("../../worker/entrypoint.sh", import.meta.url), "utf8");
const railwayToml = readFileSync(new URL("../../railway.toml", import.meta.url), "utf8");
const browserSrc = readFileSync(new URL("./browser.ts", import.meta.url), "utf8");
const requiredDenyRanges = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "240.0.0.0/4",
  "::/128",
  "::1/128",
  "64:ff9b::/96",
  "2002::/16",
  "fc00::/7",
  "fe80::/10",
  "ff00::/8",
];

describe("smokescreen egress-guard wiring", () => {
  it.each([undefined, "", "0"])("entrypoint enforces proxy routing despite required-proxy setting %s", (required) => {
    const bin = mkdtempSync(join(tmpdir(), "personaudit-egress-"));
    try {
      writeFileSync(join(bin, "smokescreen"), "#!/bin/sh\nexit 0\n");
      writeFileSync(join(bin, "pnpm"), '#!/bin/sh\nprintf "%s\\n%s\\n" "$AUDIT_REQUIRE_EGRESS_PROXY" "$AUDIT_BROWSER_PROXY"\n');
      chmodSync(join(bin, "smokescreen"), 0o700);
      chmodSync(join(bin, "pnpm"), 0o700);
      const output = execFileSync("/bin/sh", [fileURLToPath(new URL("../../worker/entrypoint.sh", import.meta.url))], {
        env: { PATH: bin, ...(required === undefined ? {} : { AUDIT_REQUIRE_EGRESS_PROXY: required }), AUDIT_BROWSER_PROXY: "" },
        encoding: "utf8", timeout: 5000,
      });
      expect(output.trim().split("\n")).toEqual(["1", "http://127.0.0.1:4750"]);
    } finally {
      rmSync(bin, { recursive: true, force: true });
    }
  });

  it("direct worker scan execution refuses to launch without its required proxy", async () => {
    const scanModule = new URL("../../worker/src/scan-process.ts", import.meta.url).href;
    const { stdout: output } = await promisify(execFile)(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
      const { chromium } = await import("playwright");
      chromium.launch = async () => { throw new Error("Unexpected direct browser launch"); };
      process.send = (message) => { process.stdout.write(JSON.stringify(message)); return true; };
      await import(${JSON.stringify(scanModule)});
      process.emit("message", { kind: "grade", url: "https://8.8.8.8/" });
    `], {
      env: { PATH: process.env.PATH, AUDIT_REQUIRE_EGRESS_PROXY: "0" },
      encoding: "utf8", timeout: 20_000,
    });
    expect(JSON.parse(output).error).toMatch(/refusing to launch.*without an egress proxy/);
  }, 25_000);

  it("Dockerfile builds smokescreen from source and ships the binary", () => {
    expect(dockerfile).toMatch(/go install github\.com\/stripe\/smokescreen/);
    expect(dockerfile).toMatch(/COPY --from=smokescreen .*\/usr\/local\/bin\/smokescreen/);
  });

  it("Dockerfile ships and executes the entrypoint script, not a bare worker start", () => {
    expect(dockerfile).toMatch(/COPY worker\/entrypoint\.sh/);
    expect(dockerfile).toMatch(/CMD \["\/usr\/local\/bin\/entrypoint\.sh"\]/);
  });

  it("entrypoint backgrounds smokescreen on localhost before execing the worker", () => {
    expect(entrypoint).toMatch(/smokescreen .*--listen-ip 127\.0\.0\.1.*&/);
    for (const range of requiredDenyRanges) {
      expect(entrypoint).toContain(`--deny-range ${range}`);
    }
    expect(entrypoint).toMatch(/exec pnpm --filter worker start/);
  });

  it("railway.toml's startCommand points at the entrypoint, not a bare worker start", () => {
    expect(railwayToml).toMatch(/startCommand\s*=\s*"\/usr\/local\/bin\/entrypoint\.sh"/);
  });

  it("the app side still reads AUDIT_BROWSER_PROXY and can fail closed", () => {
    expect(browserSrc).toMatch(/AUDIT_BROWSER_PROXY/);
    expect(browserSrc).toMatch(/AUDIT_REQUIRE_EGRESS_PROXY/);
  });
});
