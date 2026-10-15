import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CI_GATE_WORKFLOW } from "@/lib/ci-gate-example";

describe("CI gate workflow shown in the guide", () => {
  it("matches the example workflow in the repo", () => {
    const file = readFileSync(resolve(__dirname, "../../../../examples/github-actions/accessibility-gate.yml"), "utf8");
    expect(CI_GATE_WORKFLOW).toBe(file.slice(file.indexOf("name: Accessibility gate")));
  });

  it("never tests a secret in an if: condition, which GitHub rejects", () => {
    expect(CI_GATE_WORKFLOW).not.toMatch(/if:.*secrets\./);
  });
});
