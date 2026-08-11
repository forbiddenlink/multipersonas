import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

describe("audit form surfaces the paywall on 402", () => {
  const src = fs.readFileSync(
    path.join(process.cwd(), "src/components/audit-form.tsx"),
    "utf-8",
  );
  it("branches on a 402 status distinctly from the generic error", () => {
    expect(src).toMatch(/res\.status === 402/);
  });
  it("points the user at the free grade", () => {
    expect(src).toMatch(/\/grade/);
  });
});
