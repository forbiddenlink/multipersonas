import { describe, it, expect } from "vitest";
import { normalizeSelector, defectKey } from "./defect-key.js";

/**
 * The defect key must be stable across renders. Run 4 (2026-07-16) was measured
 * with a raw-selector key and its number was unreliable because these tokens
 * change every render. These pin the collapse.
 */
describe("normalizeSelector", () => {
  it("collapses Mantine random ids to a wildcard", () => {
    expect(normalizeSelector("#mantine-u9fiwu7vi-target"))
      .toBe(normalizeSelector("#mantine-0z3ehcal8-target"));
  });

  it("collapses Mantine useId scopes (.__m__-r6r)", () => {
    expect(normalizeSelector(".__m__-r6r > input"))
      .toBe(normalizeSelector(".__m__-rap > input"));
  });

  it("collapses Emotion serialized classes", () => {
    expect(normalizeSelector(".emotion-1i9ufpo > .emotion-1ygoewh"))
      .toBe(normalizeSelector(".emotion-abc123 > .emotion-xyz789"));
  });

  it("collapses React useId, raw and CSS-escaped", () => {
    expect(normalizeSelector("#\\:r5g\\:")).toBe(normalizeSelector("#\\:r4m\\:"));
    expect(normalizeSelector("#:r5g:")).toBe(normalizeSelector("#:r4m:"));
  });

  it("keeps genuinely different elements distinct", () => {
    // data-testid and semantic selectors are stable and must NOT collapse together.
    expect(normalizeSelector('button[data-testid="export-pdf"]'))
      .not.toBe(normalizeSelector('button[data-testid="embed-link"]'));
    expect(normalizeSelector('li[aria-label="Browse models"]'))
      .not.toBe(normalizeSelector('li[aria-label="Browse databases"]'));
  });

  it("does not touch a selector with no generated tokens", () => {
    expect(normalizeSelector("nav > a.logo")).toBe("nav > a.logo");
    expect(normalizeSelector("h2")).toBe("h2");
  });

  it("leaves stable PascalCase Mantine component classes alone", () => {
    // mantine-Menu / mantine-Button-label are deterministic component names, not
    // per-render ids. The random-id pattern is lowercase base36, so case protects them.
    const s = "li.mantine-Menu-item > span.mantine-Button-label";
    expect(normalizeSelector(s)).toBe(s);
  });

  it("leaves Mantine's stable hashed classes (m_<hex>) alone", () => {
    // m_5476e0d3 is a deterministic style hash, stable across renders — collapsing
    // it would merge distinct components.
    const s = "button > .m_5476e0d3.mb-mantine-Menu-itemLabel";
    expect(normalizeSelector(s)).toBe(s);
  });
});

describe("defectKey", () => {
  it("makes the same defect on two renders one key", () => {
    const a = { ruleId: "aria-allowed-attr", target: "#mantine-u9fiwu7vi-target", pageUrl: "https://x/1" };
    const b = { ruleId: "aria-allowed-attr", target: "#mantine-0z3ehcal8-target", pageUrl: "https://x/2" };
    expect(defectKey(a)).toBe(defectKey(b));
  });

  it("separates different rules on the same element", () => {
    expect(defectKey({ ruleId: "a", target: ".x" })).not.toBe(defectKey({ ruleId: "b", target: ".x" }));
  });

  it("falls back to title then pageUrl when fields are missing", () => {
    expect(defectKey({ title: "Custom", pageUrl: "https://x/" })).toBe("Custom|https://x/");
  });
});
