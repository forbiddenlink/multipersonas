import { describe, expect, it } from "vitest";
import { projectsEmptyHint, projectsIntro } from "@/lib/project-copy";

describe("projects page copy", () => {
  it("talks about grades and re-grading for Free, never audits or re-runs", () => {
    for (const text of [projectsIntro(false), projectsEmptyHint(false)]) {
      expect(text).toMatch(/grades/);
      expect(text).toMatch(/re-grade/);
      expect(text).not.toMatch(/audits?|re-runs?|scan history/i);
    }
  });

  it("keeps the audit and re-run wording for paid plans", () => {
    expect(projectsIntro(true)).toMatch(/saved audits/);
    expect(projectsEmptyHint(true)).toMatch(/re-runs/);
  });

  it("has no em dashes", () => {
    for (const text of [projectsIntro(true), projectsIntro(false), projectsEmptyHint(true), projectsEmptyHint(false)]) {
      expect(text).not.toContain("—");
    }
  });
});
