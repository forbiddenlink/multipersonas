import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

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
