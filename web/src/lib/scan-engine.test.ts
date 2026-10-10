import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { AXE_CORE_VERSION } from "./scan-engine";

describe("scan engine facts", () => {
  it("names the axe-core version the lockfile resolves", () => {
    const lock = fs.readFileSync(path.join(process.cwd(), "..", "pnpm-lock.yaml"), "utf-8");
    expect(lock).toContain(`\n  axe-core@${AXE_CORE_VERSION}: {}`);
  });
});
