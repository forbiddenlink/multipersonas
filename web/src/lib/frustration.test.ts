import { describe, it, expect } from "vitest";
import { frustrationSeries, frustrationBand } from "./frustration";

describe("frustrationSeries", () => {
  it("returns an empty series for no steps", () => {
    expect(frustrationSeries([], false)).toEqual([]);
    expect(frustrationSeries([], true)).toEqual([]);
  });

  it("returns one score per step", () => {
    const steps = [
      { pageUrl: "/a", action: "navigate" },
      { pageUrl: "/b", action: "click" },
      { pageUrl: "/c", action: "click" },
    ];
    expect(frustrationSeries(steps, true)).toHaveLength(3);
  });

  it("ends calm when the goal was reached", () => {
    const steps = [
      { pageUrl: "/a", action: "navigate" },
      { pageUrl: "/b", action: "click" },
      { pageUrl: "/checkout", action: "click" },
    ];
    const series = frustrationSeries(steps, true);
    // Relief is applied to the final step, so it should be lower than the pre-terminal peak.
    expect(series.at(-1)!).toBeLessThan(50);
  });

  it("ends high when looping without reaching the goal", () => {
    // Same page + same action, over and over: a stuck user.
    const steps = Array.from({ length: 6 }, () => ({ pageUrl: "/login", action: "click" }));
    const series = frustrationSeries(steps, false);
    expect(series.at(-1)!).toBeGreaterThan(75);
    // And it should be non-trivially higher than the first step.
    expect(series.at(-1)!).toBeGreaterThan(series[0]!);
  });

  it("penalizes revisiting a page over first-time progress", () => {
    const smooth = frustrationSeries(
      [
        { pageUrl: "/a", action: "navigate" },
        { pageUrl: "/b", action: "click" },
        { pageUrl: "/c", action: "click" },
      ],
      false,
    );
    const looping = frustrationSeries(
      [
        { pageUrl: "/a", action: "navigate" },
        { pageUrl: "/b", action: "click" },
        { pageUrl: "/a", action: "click" },
      ],
      false,
    );
    // The third step revisits /a in the looping case — higher than smooth's fresh /c.
    expect(looping[2]!).toBeGreaterThan(smooth[2]!);
  });

  it("clamps every score to 0..100", () => {
    const steps = Array.from({ length: 20 }, () => ({ pageUrl: "/x", action: "click" }));
    for (const s of frustrationSeries(steps, false)) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});

describe("frustrationBand", () => {
  it("maps scores to ascending bands", () => {
    expect(frustrationBand(10).band).toBe("calm");
    expect(frustrationBand(40).band).toBe("friction");
    expect(frustrationBand(60).band).toBe("struggling");
    expect(frustrationBand(90).band).toBe("blocked");
  });
});
