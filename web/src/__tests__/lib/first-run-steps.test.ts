import { describe, expect, it } from "vitest";
import { firstRunSteps } from "@/lib/first-run-steps";

const grade = (url: string, token = "t") => ({ token, entry_url: url, status: "completed", letter: "C", created_at: "2026-10-01T00:00:00Z" });
const project = (url: string) => ({ id: "p1", name: "Acme", url });

describe("firstRunSteps", () => {
  it("starts with nothing done and a grade link first", () => {
    const steps = firstRunSteps({ grades: [], projects: [] });
    expect(steps.map((s) => s.done)).toEqual([false, false, false]);
    expect(steps[0]?.href).toBe("/grade");
  });

  it("marks the grade done and sends step 2 to a one-click project for the newest grade", () => {
    const steps = firstRunSteps({ grades: [grade("https://acme.com/")], projects: [] });
    expect(steps.map((s) => s.done)).toEqual([true, false, false]);
    expect(steps[1]?.href).toBe(`/projects?url=${encodeURIComponent("https://acme.com/")}`);
  });

  it("marks the project done and sends step 3 to a re-grade of the project site", () => {
    const steps = firstRunSteps({ grades: [grade("https://acme.com/")], projects: [project("https://www.acme.com/")] });
    expect(steps.map((s) => s.done)).toEqual([true, true, false]);
    expect(steps[2]?.href).toBe(`/grade?url=${encodeURIComponent("https://www.acme.com/")}`);
  });

  it("marks the re-grade done only with two grades of a project's own site", () => {
    const other = firstRunSteps({
      grades: [grade("https://acme.com/", "a"), grade("https://other.test/", "b")],
      projects: [project("https://acme.com/")],
    });
    expect(other[2]?.done).toBe(false);
    const same = firstRunSteps({
      grades: [grade("https://acme.com/", "a"), grade("https://www.acme.com/x", "b")],
      projects: [project("https://acme.com/")],
    });
    expect(same.map((s) => s.done)).toEqual([true, true, true]);
  });
});
