import { afterEach, describe, expect, it } from "vitest";
import {
  GRADE_TOKEN_STORAGE_KEY,
  MAX_GRADE_TOKENS,
  clearRememberedGradeTokens,
  parseGradeTokens,
  readRememberedGradeTokens,
  rememberGradeToken,
} from "@/lib/grade-tokens";

const TOKEN_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TOKEN_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

afterEach(() => {
  localStorage.clear();
});

describe("parseGradeTokens", () => {
  it("keeps only uuid-shaped strings, de-duped, capped", () => {
    const extras = Array.from({ length: 25 }, (_, i) =>
      `cccccccc-cccc-4ccc-8ccc-${String(i).padStart(12, "0")}`,
    );
    expect(parseGradeTokens([TOKEN_A, "nope", TOKEN_A, 12, extras[0], ...extras])).toEqual([
      TOKEN_A,
      ...extras.slice(0, MAX_GRADE_TOKENS - 1),
    ]);
  });

  it("returns empty for non-arrays", () => {
    expect(parseGradeTokens(null)).toEqual([]);
    expect(parseGradeTokens({ token: TOKEN_A })).toEqual([]);
  });
});

describe("remembered grade tokens", () => {
  it("stores newest first and skips junk", () => {
    rememberGradeToken("not-a-token");
    rememberGradeToken(TOKEN_A);
    rememberGradeToken(TOKEN_B);
    rememberGradeToken(TOKEN_A);
    expect(readRememberedGradeTokens()).toEqual([TOKEN_A, TOKEN_B]);
    expect(JSON.parse(localStorage.getItem(GRADE_TOKEN_STORAGE_KEY) ?? "[]")).toEqual([
      TOKEN_A,
      TOKEN_B,
    ]);
  });

  it("clears the stored list", () => {
    rememberGradeToken(TOKEN_A);
    clearRememberedGradeTokens();
    expect(readRememberedGradeTokens()).toEqual([]);
  });
});
