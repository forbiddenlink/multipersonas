import { expect, it } from "vitest";
import { isIntervalDue, killSwitchEnabled, positiveEnvInt } from "./config.js";
it("does not turn a positive fraction into an immediate timeout or busy poll", () => {
  expect(positiveEnvInt("0.5", 3000)).toBe(3000);
});

it("identifies when maintenance is due", () => {
  expect(isIntervalDue(1_000, null, 60_000)).toBe(true);
  expect(isIntervalDue(60_999, 1_000, 60_000)).toBe(false);
  expect(isIntervalDue(61_000, 1_000, 60_000)).toBe(true);
});

it("reads the same kill switch values as the web app", () => {
  expect(killSwitchEnabled({ AUDIT_KILL_SWITCH: "1" })).toBe(true);
  expect(killSwitchEnabled({ AUDIT_KILL_SWITCH: "true" })).toBe(true);
  expect(killSwitchEnabled({ AUDIT_KILL_SWITCH: "0" })).toBe(false);
  expect(killSwitchEnabled({})).toBe(false);
});
