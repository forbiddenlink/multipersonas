import { describe, expect, it } from "vitest";
import { normalizeGradeInput, prefillFromSearch } from "@/lib/grade-url";

describe("normalizeGradeInput", () => {
  it("prefixes https:// on a bare host", () => {
    expect(normalizeGradeInput("example.com")).toBe("https://example.com");
    expect(normalizeGradeInput("  www.example.com/pricing ")).toBe("https://www.example.com/pricing");
    expect(normalizeGradeInput("localhost:3000")).toBe("https://localhost:3000");
  });
  it("leaves explicit schemes alone so the validator can reject non-http ones", () => {
    expect(normalizeGradeInput("http://example.com")).toBe("http://example.com");
    expect(normalizeGradeInput("HTTPS://example.com")).toBe("HTTPS://example.com");
    expect(normalizeGradeInput("ftp://example.com")).toBe("ftp://example.com");
    expect(normalizeGradeInput("javascript:alert(1)")).toBe("javascript:alert(1)");
  });
  it("returns empty input unchanged", () => {
    expect(normalizeGradeInput("   ")).toBe("");
  });
});

describe("prefillFromSearch", () => {
  it("accepts an http(s) url param", () => {
    expect(prefillFromSearch("?url=https%3A%2F%2Fexample.com%2Fa")).toBe("https://example.com/a");
  });
  it("rejects missing, non-http, malformed, or oversized values", () => {
    expect(prefillFromSearch("")).toBeNull();
    expect(prefillFromSearch("?url=javascript%3Aalert(1)")).toBeNull();
    expect(prefillFromSearch("?url=not-a-url")).toBeNull();
    expect(prefillFromSearch(`?url=https://a.com/${"x".repeat(3000)}`)).toBeNull();
  });
});
