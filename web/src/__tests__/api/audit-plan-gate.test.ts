import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * The persona audit must refuse free/anon callers BEFORE consuming a rate-limit slot or
 * reserving spend, so a gated request costs nothing. Source-level guard (mirrors
 * audit-no-private) so a regression fails the moment the ordering breaks.
 */
describe("audit route gates personas by plan before spend", () => {
  const src = fs.readFileSync(
    path.join(process.cwd(), "src/app/api/audit/route.ts"),
    "utf-8",
  );

  it("checks planAllowsPersonas and returns a 402 upgrade", () => {
    expect(src).toMatch(/planAllowsPersonas/);
    expect(src).toMatch(/status:\s*402/);
    expect(src).toMatch(/upgrade:\s*true/);
  });

  it("gates before consumeRateLimit and reserveSpend", () => {
    const gate = src.indexOf("planAllowsPersonas");
    const rate = src.indexOf("consumeRateLimit(");
    const spend = src.indexOf("reserveSpend(");
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(rate);
    expect(gate).toBeLessThan(spend);
  });
});
