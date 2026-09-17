import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isIntervalDue, positiveEnvInt } from "./config.js";
it("does not turn a positive fraction into an immediate timeout or busy poll", () => {
  expect(positiveEnvInt("0.5", 3000)).toBe(3000);
});

it("identifies when maintenance is due", () => {
  expect(isIntervalDue(1_000, null, 60_000)).toBe(true);
  expect(isIntervalDue(60_999, 1_000, 60_000)).toBe(false);
  expect(isIntervalDue(61_000, 1_000, 60_000)).toBe(true);
});

it("schedules stale-job recovery before claiming work, not only while idle", () => {
  const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
  const reap = source.indexOf("await reapStaleJobs()");
  const claim = source.indexOf("ranSomething = await claimAndRun()");
  const idleBranch = source.indexOf("if (!ranSomething)");

  expect(reap).toBeGreaterThan(-1);
  expect(reap).toBeLessThan(claim);
  expect(reap).toBeLessThan(idleBranch);
});
