import { describe, it, expect } from "vitest";
import { safeRedirectPath } from "@/lib/safe-redirect";

describe("safeRedirectPath", () => {
  it("allows plain same-origin paths", () => {
    expect(safeRedirectPath("/projects")).toBe("/projects");
    expect(safeRedirectPath("/audits/abc?persona=1")).toBe("/audits/abc?persona=1");
  });

  it("rejects protocol-relative and absolute URLs", () => {
    expect(safeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("http://evil.com/x")).toBe("/dashboard");
  });

  it("rejects backslash open-redirect tricks", () => {
    expect(safeRedirectPath("/\\evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("/foo\\bar")).toBe("/dashboard");
  });

  it("rejects control characters in the path", () => {
    expect(safeRedirectPath("/projects\t")).toBe("/dashboard");
    expect(safeRedirectPath("/foo\nbar")).toBe("/dashboard");
  });

  it("falls back on empty or non-path values", () => {
    expect(safeRedirectPath(null)).toBe("/dashboard");
    expect(safeRedirectPath("")).toBe("/dashboard");
    expect(safeRedirectPath("projects")).toBe("/dashboard");
    expect(safeRedirectPath(null, "/settings")).toBe("/settings");
  });
});
