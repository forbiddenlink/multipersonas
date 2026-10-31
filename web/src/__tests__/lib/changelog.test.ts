import { describe, expect, it } from "vitest";
import { CHANGELOG, changelogIds } from "@/lib/changelog";

describe("changelogIds", () => {
  it("derives pr-<number> in entry order", () => {
    const e = (pr: number) => ({ date: "2026-10-28", text: "x", pr });
    expect(changelogIds([e(5), e(3)])).toEqual(["pr-5", "pr-3"]);
  });

  it("suffixes a repeated PR number deterministically", () => {
    const e = (pr: number) => ({ date: "2026-10-28", text: "x", pr });
    expect(changelogIds([e(5), e(3), e(5), e(5)])).toEqual(["pr-5", "pr-3", "pr-5-2", "pr-5-3"]);
  });

  it("is unique across the real CHANGELOG and valid as an html id", () => {
    const ids = changelogIds(CHANGELOG);
    expect(ids).toHaveLength(CHANGELOG.length);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^pr-\d+(-\d+)?$/);
  });
});
