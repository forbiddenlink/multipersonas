import { describe, it, expect } from "vitest";
import {
  scoreColor,
  scoreLabel,
  scoreRingColor,
  scoreBgGlow,
  scoreStrokeColor,
} from "@/lib/score";

describe("scoreColor", () => {
  it("returns the minor severity token for scores >= 80", () => {
    expect(scoreColor(80)).toBe("var(--severity-minor)");
    expect(scoreColor(100)).toBe("var(--severity-minor)");
  });

  it("returns the moderate severity token for scores 50-79", () => {
    expect(scoreColor(50)).toBe("var(--severity-moderate)");
    expect(scoreColor(79)).toBe("var(--severity-moderate)");
  });

  it("returns the critical severity token for scores < 50", () => {
    expect(scoreColor(0)).toBe("var(--severity-critical)");
    expect(scoreColor(49)).toBe("var(--severity-critical)");
  });
});

describe("scoreLabel", () => {
  it("returns Good for >= 80", () => {
    expect(scoreLabel(80)).toBe("Good");
  });

  it("returns Needs Work for 50-79", () => {
    expect(scoreLabel(65)).toBe("Needs Work");
  });

  it("returns Poor for < 50", () => {
    expect(scoreLabel(20)).toBe("Poor");
  });

  it("handles boundary values", () => {
    expect(scoreLabel(80)).toBe("Good");
    expect(scoreLabel(79)).toBe("Needs Work");
    expect(scoreLabel(50)).toBe("Needs Work");
    expect(scoreLabel(49)).toBe("Poor");
  });
});

describe("scoreRingColor", () => {
  it("returns correct border colors", () => {
    expect(scoreRingColor(90)).toBe("border-green-400");
    expect(scoreRingColor(60)).toBe("border-yellow-400");
    expect(scoreRingColor(30)).toBe("border-red-400");
  });
});

describe("scoreBgGlow", () => {
  it("returns correct shadow colors", () => {
    expect(scoreBgGlow(90)).toBe("shadow-green-400/20");
    expect(scoreBgGlow(60)).toBe("shadow-yellow-400/20");
    expect(scoreBgGlow(30)).toBe("shadow-red-400/20");
  });
});

describe("scoreStrokeColor", () => {
  it("returns oklch stroke colors", () => {
    expect(scoreStrokeColor(90)).toContain("oklch");
    expect(scoreStrokeColor(60)).toContain("oklch");
    expect(scoreStrokeColor(30)).toContain("oklch");
  });

  it("returns different colors for different thresholds", () => {
    const good = scoreStrokeColor(90);
    const mid = scoreStrokeColor(60);
    const poor = scoreStrokeColor(30);
    expect(good).not.toBe(mid);
    expect(mid).not.toBe(poor);
    expect(good).not.toBe(poor);
  });
});
