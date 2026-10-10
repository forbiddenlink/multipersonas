import { describe, it, expect } from "vitest";
import { generateScanReport } from "./generator.js";

const s = (key: string, expires: string) => ({ key, reason: "vendor widget", owner: "ana", expires });

describe("generateScanReport suppressions", () => {
  it("lists expired, suppressed and unmatched suppressions in separate sections", () => {
    const md = generateScanReport("https://x/", [], ["https://x/"], [], {
      active: [s("a|1", "2099-01-01")], expired: [s("b|2", "2020-01-01")], unmatched: [s("c|3", "2099-01-01")],
    });
    expect(md).toMatch(/## Expired suppressions\n[\s\S]*`b\|2`: vendor widget \(owner ana, expires 2020-01-01\)/);
    expect(md).toMatch(/## Suppressed defects \(accepted risk\)\n[\s\S]*`a\|1`/);
    expect(md).toMatch(/## Suppressions matching no current defect\n[\s\S]*`c\|3`/);
  });

  it("adds no suppression sections when none were supplied", () => {
    expect(generateScanReport("https://x/", [], ["https://x/"])).not.toMatch(/uppress/);
  });
});
