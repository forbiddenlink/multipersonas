import { describe, it, expect } from "vitest";
import { formatShortDate, hostname } from "@/lib/format";

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
