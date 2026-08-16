import { describe, it, expect } from "vitest";
import { parseAriaRef, ariaRefLocator } from "./aria-ref.js";

describe("parseAriaRef", () => {
  it("accepts a bare snapshot ref", () => {
    expect(parseAriaRef("e12")).toBe("e12");
    expect(parseAriaRef("E3")).toBe("e3");
    expect(parseAriaRef("  e1  ")).toBe("e1");
  });

  it("accepts a frame-prefixed ref", () => {
    expect(parseAriaRef("f1e3")).toBe("f1e3");
  });

  it("accepts Playwright locator / YAML forms", () => {
    expect(parseAriaRef("aria-ref=e12")).toBe("e12");
    expect(parseAriaRef("[ref=e12]")).toBe("e12");
    expect(parseAriaRef("- button \"Pay\" [ref=e7]")).toBe("e7");
  });

  it("returns null for accessible names so they fall through to getByRole", () => {
    expect(parseAriaRef("Place Order")).toBeNull();
    expect(parseAriaRef("Submit")).toBeNull();
    expect(parseAriaRef("#checkout")).toBeNull();
    expect(parseAriaRef("")).toBeNull();
    // A product named "e" or "e-mail" must not be treated as a ref.
    expect(parseAriaRef("e")).toBeNull();
    expect(parseAriaRef("email")).toBeNull();
  });
});

describe("ariaRefLocator", () => {
  it("builds the Playwright aria-ref selector", () => {
    expect(ariaRefLocator("e12")).toBe("aria-ref=e12");
  });
});
