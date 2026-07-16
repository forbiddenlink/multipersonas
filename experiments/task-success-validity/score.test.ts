import { describe, it, expect } from "vitest";
import { score, isCorrect, type Outcome } from "./score.js";

/**
 * Scoring is tested against known inputs BEFORE the run, so a disappointing
 * result cannot be blamed on arithmetic and a flattering one cannot be produced
 * by it.
 */
const mk = (label: "achievable" | "impossible", verdict: "achieved" | "blocked", id = label + verdict): Outcome =>
  ({ id, label, verdict });

describe("isCorrect", () => {
  it("achievable+achieved and impossible+blocked are correct", () => {
    expect(isCorrect(mk("achievable", "achieved"))).toBe(true);
    expect(isCorrect(mk("impossible", "blocked"))).toBe(true);
  });
  it("the two error cases are incorrect", () => {
    expect(isCorrect(mk("impossible", "achieved"))).toBe(false); // false-achieved
    expect(isCorrect(mk("achievable", "blocked"))).toBe(false); // false-blocked
  });
});

describe("score — the trust-killer is falseAchieved", () => {
  it("a perfect run: 100% agreement, 0 false-achieved, survives + trustworthy", () => {
    const s = score([
      ...Array.from({ length: 5 }, (_, i) => mk("achievable", "achieved", "a" + i)),
      ...Array.from({ length: 5 }, (_, i) => mk("impossible", "blocked", "i" + i)),
    ]);
    expect(s.agreement).toBe(100);
    expect(s.falseAchieved).toBe(0);
    expect(s.primaryVerdict).toBe("SURVIVES_PRIMARY");
    expect(s.trustReading).toBe("trustworthy");
  });

  it("2 of 5 impossible goals reported achieved => 40% => KILL", () => {
    const s = score([
      ...Array.from({ length: 5 }, (_, i) => mk("achievable", "achieved", "a" + i)),
      mk("impossible", "achieved", "bad1"),
      mk("impossible", "achieved", "bad2"),
      ...Array.from({ length: 3 }, (_, i) => mk("impossible", "blocked", "i" + i)),
    ]);
    expect(s.falseAchieved).toBe(40);
    expect(s.falseAchievedIds).toEqual(["bad1", "bad2"]);
    expect(s.primaryVerdict).toBe("KILL");
  });

  it("exactly 20% (1 of 5) survives the primary — threshold is strictly greater-than", () => {
    const s = score([
      ...Array.from({ length: 5 }, (_, i) => mk("achievable", "achieved", "a" + i)),
      mk("impossible", "achieved", "bad1"),
      ...Array.from({ length: 4 }, (_, i) => mk("impossible", "blocked", "i" + i)),
    ]);
    expect(s.falseAchieved).toBe(20);
    expect(s.primaryVerdict).toBe("SURVIVES_PRIMARY");
  });

  it("false-blocked lowers agreement but does not trigger the primary kill", () => {
    const s = score([
      mk("achievable", "blocked", "fb1"),
      mk("achievable", "blocked", "fb2"),
      ...Array.from({ length: 3 }, (_, i) => mk("achievable", "achieved", "a" + i)),
      ...Array.from({ length: 5 }, (_, i) => mk("impossible", "blocked", "i" + i)),
    ]);
    expect(s.falseBlocked).toBe(40);
    expect(s.falseAchieved).toBe(0);
    expect(s.primaryVerdict).toBe("SURVIVES_PRIMARY");
    expect(s.agreement).toBe(80);
    expect(s.trustReading).toBe("weak"); // 80 is not > 80
  });

  it("agreement bands: >80 trustworthy, <60 noise, between weak", () => {
    const band = (correct: number) => {
      const out: Outcome[] = [];
      for (let i = 0; i < correct; i++) out.push(mk("achievable", "achieved", "c" + i));
      for (let i = 0; i < 10 - correct; i++) out.push(mk("achievable", "blocked", "w" + i));
      return score(out).trustReading;
    };
    expect(band(9)).toBe("trustworthy");
    expect(band(7)).toBe("weak");
    expect(band(5)).toBe("noise");
  });
});
