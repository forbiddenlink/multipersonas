import { afterEach, describe, expect, it } from "vitest";
import {
  GRADE_TOKEN_STORAGE_KEY,
  MAX_GRADE_TOKENS,
  clearRememberedGradeTokens,
  gradeTokenFromInput,
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

describe("gradeTokenFromInput", () => {
  it("reads the token out of a pasted result link, with or without the host", () => {
    expect(gradeTokenFromInput(`https://personaudit.com/grade/${TOKEN_A}`)).toBe(TOKEN_A);
    expect(gradeTokenFromInput(`  http://localhost:3000/grade/${TOKEN_A.toUpperCase()}?x=1#top `)).toBe(TOKEN_A);
    expect(gradeTokenFromInput(`personaudit.com/grade/${TOKEN_A}`)).toBe(TOKEN_A);
  });

  it("accepts a bare token", () => {
    expect(gradeTokenFromInput(TOKEN_B)).toBe(TOKEN_B);
  });

  it("rejects anything else", () => {
    expect(gradeTokenFromInput("")).toBeNull();
    expect(gradeTokenFromInput("hello")).toBeNull();
    expect(gradeTokenFromInput("https://example.com/grade/not-a-token")).toBeNull();
    expect(gradeTokenFromInput(`https://example.com/other/${TOKEN_A}`)).toBeNull();
  });
});
