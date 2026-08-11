import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * The grade result page must not use a `<meta http-equiv="refresh">` timed full-page
 * reload while a scan is in progress — that is WCAG 2.2.1 failure F5 (an uncontrollable
 * timed refresh resets a screen-reader/magnifier user's reading position every few
 * seconds). It polls in place via the GradePoll client component instead, which
 * soft-refreshes (preserving focus/scroll) and exposes a pause control.
 *
 * Source-level guard so a regression fails the moment the meta-refresh comes back.
 */
describe("grade result page avoids WCAG 2.2.1 F5 (meta refresh)", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/app/grade/[token]/page.tsx"),
    "utf-8",
  );

  it("does not use http-equiv refresh", () => {
    expect(source).not.toMatch(/http-?[eE]quiv/i);
  });

  it("uses the in-place GradePoll poller instead", () => {
    expect(source).toMatch(/GradePoll/);
  });
});
