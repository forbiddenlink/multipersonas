import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf-8");

describe("marketing copy stays honest about hosted vs CLI", () => {
  it("does not call behind-login a Pro layer on the homepage", () => {
    const src = read("src/app/page.tsx");
    expect(src).not.toMatch(/Behind-login crawls and persona task-success are the/);
    expect(src).toMatch(/keyless CLI/);
    expect(src).toMatch(/Persona task-success/);
  });

  it("does not promise that signup records persona task-success for free accounts", () => {
    const src = read("src/app/page.tsx");
    expect(src).not.toMatch(/every grade you run becomes a record/);
    expect(src).toMatch(/dashboard/);
  });

  it("does not say scheduled re-scans are unbuilt", () => {
    const src = read("src/app/for-agencies/page.tsx");
    expect(src).not.toMatch(/Scheduled re-scans are next/);
    expect(src).toMatch(/scheduled/i);
  });

  it("names the hosted/CLI split in llms.txt", () => {
    const src = read("public/llms.txt");
    expect(src).toMatch(/hosted/i);
    expect(src).toMatch(/CLI/);
    expect(src).not.toMatch(/Credentials never leave the operator's machine\.\s*$/m);
  });

  it("does not send Request Pro to the owner-only waitlist inbox", () => {
    expect(read("src/components/pro-audit-upsell.tsx")).not.toMatch(/["']\/waitlist["']/);
    expect(read("src/app/(app)/settings/page.tsx")).not.toMatch(/["']\/waitlist["']/);
  });

  it("does not sell hosted behind-login on the grade result conversion cluster", () => {
    const src = read("src/components/grade-next-steps.tsx");
    expect(src).toMatch(/CLI/);
    expect(src).not.toMatch(/hosted behind-login is (ready|live|available)/i);
    expect(src).toMatch(/Save this grade/);
  });

  it("does not name $199 on the agency page unless checkout can actually take payment", () => {
    const src = read("src/app/for-agencies/page.tsx");
    expect(src).toMatch(/FOUNDING_CHECKOUT_OPEN = isFoundingCheckoutOpen\(\)/);
    expect(src).toMatch(/the price is named when checkout is live/);
    expect(src).not.toMatch(/What do I get at \$199/);
  });
});
