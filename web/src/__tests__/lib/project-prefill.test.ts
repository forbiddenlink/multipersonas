import { describe, expect, it } from "vitest";
import { projectOffer, projectPrefill } from "@/lib/project-prefill";

describe("projectPrefill", () => {
  it("turns a completed grade URL into safe project-form defaults", () => {
    expect(projectPrefill("https://www.example.com/pricing")).toEqual({
      name: "example.com",
      url: "https://www.example.com/pricing",
    });
  });
});

describe("projectOffer", () => {
  const prefill = { name: "acme.com", url: "https://acme.com/" };
  const mine = { id: "p1", name: "Acme", url: "https://www.acme.com/pricing" };

  it("offers a one-click create when the plan has room", () => {
    expect(projectOffer(prefill, [], 1)).toEqual({ kind: "create", prefill });
  });

  it("points at the existing project when the same site is already saved, even under the cap", () => {
    expect(projectOffer(prefill, [mine], 5)).toEqual({ kind: "exists", project: mine });
  });

  it("states the limit and points at the existing project when the cap is hit", () => {
    const other = { id: "p2", name: "Other", url: "https://other.test/" };
    expect(projectOffer(prefill, [other], 1)).toEqual({ kind: "limit", limit: 1, project: other });
  });

  it("never blocks a plan without a cap", () => {
    const other = { id: "p2", name: "Other", url: "https://other.test/" };
    expect(projectOffer(prefill, [other, mine], null).kind).not.toBe("limit");
  });

  it("offers nothing without a prefill", () => {
    expect(projectOffer(null, [], 1)).toEqual({ kind: "none" });
  });
});
