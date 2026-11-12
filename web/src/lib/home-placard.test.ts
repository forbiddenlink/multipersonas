import { describe, expect, it } from "vitest";
import { publicScanLetter } from "@/lib/home-placard";
import { PROBE_LEDGER } from "@/lib/probe-ledger";

describe("publicScanLetter", () => {
  it("grades the saucedemo public scan (0 issues) with the engine scorer", () => {
    const row = PROBE_LEDGER.find((r) => r.host === "saucedemo.com")!;
    expect(publicScanLetter(row)).toBe("A");
  });

  it("returns no letter for a public scan with issues", () => {
    const row = PROBE_LEDGER.find((r) => r.host === "the-internet.herokuapp.com")!;
    expect(publicScanLetter(row)).toBeNull();
  });
});
