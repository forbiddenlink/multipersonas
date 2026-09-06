import { expect, it } from "vitest";
import { positiveEnvInt } from "./config.js";
it("does not turn a positive fraction into an immediate timeout or busy poll", () => {
  expect(positiveEnvInt("0.5", 3000)).toBe(3000);
});
