import { describe, it, expect } from "vitest";
import { displayPath, formatShortDate, hostname } from "@/lib/format";

describe("hostname", () => {
  it("returns the hostname of a full URL", () => {
    expect(hostname("https://www.example.com/a?b=1")).toBe("www.example.com");
  });
  it("returns the input when it is not a URL", () => {
    expect(hostname("example.com")).toBe("example.com");
  });
});

describe("formatShortDate", () => {
  it("formats an ISO timestamp with year, short month and day", () => {
    expect(formatShortDate("2026-09-03T12:00:00Z")).toMatch(/2026/);
  });
  it("returns an empty string for an invalid timestamp", () => {
    expect(formatShortDate("not a date")).toBe("");
  });
});

describe("displayPath", () => {
  it("keeps path and query, drops scheme and host", () => {
    expect(displayPath("https://example.com/pricing?plan=solo")).toBe("/pricing?plan=solo");
  });
  it("renders the root as a slash", () => {
    expect(displayPath("https://example.com")).toBe("/");
  });
  it("returns unparseable input unchanged", () => {
    expect(displayPath("example.com/about")).toBe("example.com/about");
  });
});

