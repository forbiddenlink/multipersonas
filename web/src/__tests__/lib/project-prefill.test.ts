import { describe, expect, it } from "vitest";
import { projectPrefill } from "@/lib/project-prefill";

describe("projectPrefill", () => {
  it("turns a completed grade URL into safe project-form defaults", () => {
    expect(projectPrefill("https://www.example.com/pricing")).toEqual({
      name: "example.com",
      url: "https://www.example.com/pricing",
    });
  });
});
