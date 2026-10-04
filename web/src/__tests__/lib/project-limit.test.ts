import { describe, expect, it } from "vitest";
import {
  ProjectLimitError,
  projectLimitMessage,
  toProjectLimitError,
} from "@/lib/project-limit";

describe("toProjectLimitError", () => {
  it("maps the database SQLSTATE and reads the enforced limit from the detail", () => {
    const err = toProjectLimitError({ code: "PA001", message: "project_limit", details: "limit=1" });
    expect(err).toBeInstanceOf(ProjectLimitError);
    expect(err?.limit).toBe(1);
  });

  it("maps on the message alone and tolerates a missing detail", () => {
    expect(toProjectLimitError({ message: "project_limit" })?.limit).toBeNull();
    expect(toProjectLimitError({ code: "PA001", message: "x", details: null })?.limit).toBeNull();
  });

  it("leaves every other error alone", () => {
    expect(toProjectLimitError({ code: "23505", message: "duplicate key" })).toBeNull();
    expect(toProjectLimitError({ code: "42501", message: "permission denied" })).toBeNull();
  });
});

describe("projectLimitMessage", () => {
  it("uses the same copy the app-level check shows", () => {
    expect(projectLimitMessage(1)).toBe("Your plan includes 1 project. See pricing to add more.");
    expect(projectLimitMessage(5)).toBe("Your plan includes 5 projects. See pricing to add more.");
  });

  it("falls back to a limit-free sentence when the cap is unknown", () => {
    expect(projectLimitMessage(null)).toBe("Your plan has reached its project limit. See pricing to add more.");
  });
});
