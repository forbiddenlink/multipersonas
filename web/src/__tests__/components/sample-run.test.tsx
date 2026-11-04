import { cleanup, render, screen, within } from "@testing-library/react";
import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SampleRunLedger, SampleStuckMoment } from "@/components/dossier/sample-run";
import { PERSONA_DATA } from "@/lib/personas";
import { SAMPLE_RUN, sampleRunTally } from "@/lib/sample-evidence";

afterEach(cleanup);

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf-8");

describe("sample run (home hero)", () => {
  it("tallies the verdict from the data, so the headline cannot drift from the table", () => {
    const { reached, total } = sampleRunTally();
    render(<SampleStuckMoment />);
    expect(screen.getByText(`${reached} of ${total} personas checked out.`)).toBeTruthy();
    expect(reached).toBe(3);
  });

  it("labels the whole example as not a customer result", () => {
    render(<SampleStuckMoment />);
    expect(screen.getByText(/example run, not a customer result/i)).toBeTruthy();
    expect(screen.getByText(/AI opinion, labeled as such/i)).toBeTruthy();
  });

  it("lists every sample persona by the library's own name, with a text result", () => {
    render(<SampleRunLedger />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(SAMPLE_RUN.personas.length);
    SAMPLE_RUN.personas.forEach((p, i) => {
      expect(within(rows[i]!).getByText(PERSONA_DATA[p.id].name)).toBeTruthy();
      expect(within(rows[i]!).getByText(p.outcome === "stuck" ? /^Stuck$/ : /^Reached it$/)).toBeTruthy();
    });
  });

  it("gives an opinion only to personas that stalled", () => {
    for (const p of SAMPLE_RUN.personas) expect(p.opinion === null).toBe(p.outcome === "reached");
  });
});

describe("persona-first copy keeps the product's hard lines", () => {
  const files = ["src/app/page.tsx", "src/app/pricing/page.tsx", "src/components/dossier/sample-run.tsx", "src/lib/sample-evidence.ts"];

  it("leads the home page with the stuck-moment question", () => {
    const home = read("src/app/page.tsx");
    expect(home).toMatch(/See where a first-time visitor gets stuck on your site\./);
    expect(home).toMatch(/<SampleStuckMoment/);
    expect(home).toMatch(/They do not find accessibility\s+defects/);
  });

  it("links the task-success evidence", () => {
    expect(read("src/app/page.tsx")).toMatch(/experiments\/task-success-validity/);
  });

  it.each(files)("%s never promises compliance", (file) => {
    const src = read(file);
    expect(src).not.toMatch(/\bcompliant\b|compliance guarantee/i);
  });

  it("says persona runs are paid-plan only, matching entitlements", () => {
    const home = read("src/app/page.tsx");
    expect(home).toMatch(/Persona walkthroughs are on Solo and up/);
    expect(read("src/lib/entitlements.ts")).toMatch(/PERSONA_PLANS[^=]*= \["pro", "team"\]/);
  });
});
