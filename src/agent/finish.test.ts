import { describe, it, expect } from "vitest";
import { finishSchema } from "./engine.js";

/**
 * Regression guard for 2026-07-15.
 *
 * The agent's only way to end a run was `mark_goal_complete`, so it called that
 * to mean "I am done" — and the report read it as "I succeeded". A run whose own
 * summary said "I was unable to accomplish my goals ... I gave up" rendered as
 * "Goal: Completed". The report contradicted its own evidence.
 *
 * The rule these pin: goal achieved ONLY on an explicit, valid "achieved".
 */
const achieved = (input: unknown) => {
  const parsed = finishSchema.safeParse(input);
  return parsed.success && parsed.data.outcome === "achieved";
};

describe("finish outcome — the report must not claim success the agent never claimed", () => {
  it("honours an explicit success", () => {
    expect(achieved({ outcome: "achieved", summary: "Signed up and reached the dashboard." })).toBe(true);
  });

  it("records the real Metabase session as blocked, not completed", () => {
    expect(
      achieved({
        outcome: "blocked",
        summary: "I was unable to accomplish my goals. Every URL redirected to a login screen.",
      }),
    ).toBe(false);
  });

  it("does not treat a missing outcome as success", () => {
    expect(achieved({ summary: "done" })).toBe(false);
  });

  it("does not accept a made-up outcome as success", () => {
    expect(achieved({ outcome: "complete", summary: "done" })).toBe(false);
    expect(achieved({ outcome: true, summary: "done" })).toBe(false);
  });

  it("rejects an empty summary rather than reporting a blank result", () => {
    expect(finishSchema.safeParse({ outcome: "achieved", summary: "" }).success).toBe(false);
  });

  it("survives garbage without throwing", () => {
    for (const junk of [null, undefined, "achieved", 42, []]) {
      expect(() => achieved(junk)).not.toThrow();
      expect(achieved(junk)).toBe(false);
    }
  });
});
