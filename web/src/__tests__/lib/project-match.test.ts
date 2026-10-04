import { describe, it, expect } from "vitest";
import { findProjectForUrl, siteHost } from "@/lib/project-match";

const projects = [
  { id: "a", name: "Acme", url: "https://www.acme.test/" },
  { id: "b", name: "Beta", url: "https://beta.test" },
];

describe("siteHost", () => {
  it("lowercases and drops a leading www", () => {
    expect(siteHost("https://WWW.Acme.test/pricing?x=1")).toBe("acme.test");
  });
  it("is null for text that is not a URL", () => {
    expect(siteHost("acme")).toBeNull();
    expect(siteHost("")).toBeNull();
  });
});

describe("findProjectForUrl", () => {
  it("matches a deep link to the project for the same site, ignoring www", () => {
    expect(findProjectForUrl(projects, "https://acme.test/checkout/step-2")?.id).toBe("a");
  });
  it("does not match a sibling subdomain or another site", () => {
    expect(findProjectForUrl(projects, "https://app.acme.test/")).toBeUndefined();
    expect(findProjectForUrl(projects, "https://other.test/")).toBeUndefined();
  });
  it("returns undefined for an unparseable URL", () => {
    expect(findProjectForUrl(projects, "acme")).toBeUndefined();
  });
});
