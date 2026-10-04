import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf-8");

describe("marketing copy stays honest about hosted vs CLI", () => {
  it("does not sell behind-login scanning as part of the hosted sample-report upgrade", () => {
    const src = read("src/app/sample-report/page.tsx");
    expect(src).not.toMatch(/plan adds behind the login/);
    expect(src).toMatch(/Behind-login scanning runs in the CLI/);
  });

  it("does not call behind-login a Pro layer on the homepage", () => {
    const src = read("src/app/page.tsx");
    expect(src).not.toMatch(/Behind-login crawls and persona task-success are the/);
    expect(src).toMatch(/Scan signed-in flows with the free CLI; the session\s+never leaves your machine/);
    expect(src).toMatch(/Persona layer · Solo and up/);
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
    expect(read("src/app/(app)/settings/page.tsx")).not.toMatch(/["']\/waitlist["']/);
  });

  it("does not sell hosted behind-login on the grade result conversion cluster", () => {
    const src = read("src/components/grade-next-steps.tsx");
    expect(src).toMatch(/CLI/);
    expect(src).not.toMatch(/hosted behind-login is (ready|live|available)/i);
    expect(src).toMatch(/Save and track this site/);
  });

  it("does not name $199 on the agency page unless checkout can actually take payment", () => {
    const src = read("src/app/for-agencies/page.tsx");
    expect(src).toMatch(/FOUNDING_CHECKOUT_OPEN = isFoundingCheckoutOpen\(\)/);
    expect(src).toMatch(/the price is named when checkout is live/);
    expect(src).not.toMatch(/What do I get at \$199/);
  });
});

describe("pricing page states what each tier really gets", () => {
  it("does not present a paid price as buyable when its checkout is closed", () => {
    const src = read("src/app/pricing/page.tsx");
    expect(src).toMatch(/isSoloCheckoutOpen\(\)/);
    expect(src).toMatch(/isFoundingCheckoutOpen\(\)/);
    expect(src).toMatch(/Not open yet/);
  });

  it("keeps behind-login on the CLI side of the split", () => {
    const src = read("src/app/pricing/page.tsx");
    expect(src).toMatch(/Behind-login scanning runs in the CLI/);
    expect(src).toMatch(/Hosted behind-login is not built/);
    expect(src).not.toMatch(/hosted behind-login (is |now )?(ready|live|available)/i);
  });

  it("does not claim the docs page can scan behind a login from the browser", () => {
    const src = read("src/app/docs/page.tsx");
    expect(src).toMatch(/stays on your machine/);
    expect(src).not.toMatch(/hosted behind-login/i);
  });

  it("states the project caps the code actually enforces", () => {
    const src = read("src/app/pricing/page.tsx");
    // The numbers come from PROJECT_LIMITS, so a cap change cannot drift from the page.
    expect(src).toMatch(/PROJECT_LIMITS\.free/);
    expect(src).toMatch(/PROJECT_LIMITS\.pro/);
  });
});

describe("marketing copy avoids compliance claims and qualifies behind-login", () => {
  const FILES = [
    "src/app/layout.tsx",
    "src/app/page.tsx",
    "src/app/pricing/page.tsx",
    "src/app/for-agencies/page.tsx",
    "src/app/docs/page.tsx",
    "src/app/guides/wcag-checklist/page.tsx",
    "src/components/site-footer.tsx",
  ];

  it.each(FILES)("%s never says compliance verdict or compliance report", (file) => {
    const src = read(file);
    expect(src).not.toMatch(/compliance (verdict|report)/i);
    expect(src).not.toMatch(/proves compliance/i);
    expect(src).not.toMatch(/protects? (you )?from lawsuits/i);
  });

  it("does not title the site as hosted behind-the-login scanning", () => {
    const src = read("src/app/layout.tsx");
    expect(src).not.toMatch(/evidence behind the login/i);
    expect(src).not.toMatch(/authenticated accessibility scanner/i);
    expect(src).toMatch(/behind-login scanning runs locally with the CLI/);
  });

  it("qualifies behind-login in the footer and hero body as CLI/local", () => {
    expect(read("src/components/site-footer.tsx")).toMatch(/behind the login with the CLI/);
    const home = read("src/app/page.tsx");
    expect(home).toMatch(/with the free CLI/);
    expect(home).toMatch(/label="behind the login, on your machine"/);
  });
});

describe("pricing competitor claims are sourced and dated", () => {
  const src = read("src/app/pricing/page.tsx");

  it("does not repeat the unsourced yearly price guesses", () => {
    expect(src).not.toMatch(/around \$2,000\/year/);
    expect(src).not.toMatch(/around \$6,000\/year/);
    expect(src).not.toMatch(/five figures a year/);
  });

  it("states Pope Tech and Silktide pricing with links and an as-of date", () => {
    expect(src).toMatch(/https:\/\/pope\.tech\/pricing/);
    expect(src).toMatch(/https:\/\/silktide\.com\/pricing\//);
    expect(src).toMatch(/Business Plus at \$225\/month/);
    expect(src).toMatch(/12-month minimum/);
    expect(src).toMatch(/As of Oct 2026/);
  });

  it("does not claim that no other tool keys defects to a stable id", () => {
    expect(src).not.toMatch(/None of them key/);
  });
});
