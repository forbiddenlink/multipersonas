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

describe("grade result page: fix-first and coverage copy stays honest", () => {
  const FILES = [
    "src/components/grade-fix-first.tsx",
    "src/components/grade-coverage.tsx",
    "src/components/grade-next-steps.tsx",
    "src/lib/grade-fix-first.ts",
  ];

  it.each(FILES)("%s makes no compliance, lawsuit, or simulated-user claim", (file) => {
    const src = read(file);
    expect(src).not.toMatch(/compliant|compliance (verdict|report)|proves compliance/i);
    expect(src).not.toMatch(/protects? (you )?from (lawsuits|legal)/i);
    expect(src).not.toMatch(/simulat(e|es|ed|ion) (a |the )?(disabled|blind|deaf|low-vision|screen[- ]reader) (user|person|people)/i);
    expect(src).not.toMatch(/hosted behind-login is (ready|live|available)/i);
  });

  it("says who a fix-first item blocks is inferred from the rule, not simulated", () => {
    const src = read("src/components/grade-fix-first.tsx");
    expect(src).toMatch(/inferred from the rule, not simulated/);
  });

  it("states the grade is automated checks only and cites the Deque study with its link", () => {
    const src = read("src/components/grade-coverage.tsx");
    expect(src).toMatch(/automated checks only: a person has to check the rest/);
    expect(src).toMatch(/Automated tools\s+find about 57% of issues by volume/);
    expect(src).toMatch(/https:\/\/www\.deque\.com\/blog\/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues\//);
    expect(src).toMatch(/Deque, 2021 study/);
  });

  it("keeps the save-and-re-grade bridge, the CLI path, and no hosted behind-login claim", () => {
    const src = read("src/components/grade-next-steps.tsx");
    expect(src).toMatch(/Save this site and re-grade after you fix it\./);
    expect(src).toMatch(/Save and track this site/);
    expect(src).toMatch(/CLI/);
  });

  it("puts the coverage line and Fix these first on the result page", () => {
    const src = read("src/app/grade/[token]/page.tsx");
    expect(src).toMatch(/<GradeCoverageNote needsReview=\{report\.needsReview\} \/>/);
    expect(src).toMatch(/<GradeFixFirst /);
  });
});

describe("auth copy matches what a Free account gets", () => {
  const signup = read("src/app/auth/signup/signup-form.tsx");
  const shell = read("src/components/dossier/app-auth-shell.tsx");

  it("does not promise Free accounts persona runs, history of every audit, retest compare or reports", () => {
    for (const src of [signup, shell]) {
      expect(src).not.toMatch(/Save every audit/i);
      expect(src).not.toMatch(/persona runs land in your history/i);
      expect(src).not.toMatch(/Every audit, kept/);
      expect(src).not.toMatch(/Axe verdicts and persona (runs|task-success)/i);
    }
  });

  it("states what Free does include: saved grades, one project, the free CLI with the CI gate", () => {
    expect(shell).toMatch(/free grades/i);
    expect(shell).toMatch(/1 project/);
    expect(shell).toMatch(/CLI/);
    expect(shell).toMatch(/CI gate/);
    expect(signup).toMatch(/free grades/i);
  });

  it("labels every paid-only item as Solo and up", () => {
    // Each paid feature may appear only in a reason that also names the plan that sells it.
    const paid = /(persona task-success|retest|report export|exportable report)/i;
    const reasonBodies = shell.match(/body: "[^"]*"/g) ?? [];
    for (const body of reasonBodies) {
      if (paid.test(body)) expect(body).toMatch(/Solo and up/);
    }
    expect(shell).toMatch(/Solo and up/);
  });

  it("says no card is needed only because Free signup collects no payment details", () => {
    expect(signup).toMatch(/No card needed/);
    // The signup form must stay card-free for that line to be true.
    expect(signup).not.toMatch(/stripe|checkout|cardNumber|card-number/i);
    expect(read("src/app/pricing/page.tsx")).toMatch(/cadence: "forever"/);
  });

  it("keeps compliance wording and em dashes out of auth copy", () => {
    for (const src of [signup, shell]) {
      expect(src).not.toMatch(/compliance (verdict|report)/i);
      expect(src).not.toMatch(/proves compliance/i);
    }
    const strings = (signup + shell).match(/(?:body|title): "[^"]*"|>[^<>{}]*</g) ?? [];
    for (const s of strings) expect(s).not.toMatch(/—/);
  });

  it("states the password rule the validator enforces in the placeholder", () => {
    expect(signup).toMatch(/length < 8/);
    expect(signup).toMatch(/a number or symbol/);
    expect(signup).not.toMatch(/placeholder="At least 8 characters"/);
    expect(signup).toMatch(/placeholder="8\+ characters, with a number or symbol"/);
  });
});

describe("docs match the CLI", () => {
  it("states the CLI's real default output directory", () => {
    const cli = fs.readFileSync(path.join(process.cwd(), "..", "src/cli.ts"), "utf-8");
    const defaults = [...cli.matchAll(/"-o, --output <path>", "Output directory", "([^"]+)"/g)].map((m) => m[1]);
    expect(defaults.length).toBeGreaterThan(0);
    const docs = read("src/app/docs/page.tsx");
    for (const d of new Set(defaults)) expect(docs).toContain(d);
    expect(docs).not.toMatch(/mpersonas-report/);
  });

  it("does not show the legacy mpersonas binary name in the docs copy", () => {
    expect(read("src/app/docs/page.tsx")).not.toMatch(/mpersonas/);
  });
});

describe("nav and pricing details", () => {
  it("points the Guides nav link at the guides index, which exists", () => {
    expect(read("src/components/site-header.tsx")).toMatch(/href: "\/guides", label: "Guides"/);
    expect(fs.existsSync(path.join(process.cwd(), "src/app/guides/page.tsx"))).toBe(true);
  });

  it("lists the guides index in the sitemap", () => {
    expect(read("src/app/sitemap.ts")).toMatch(/\/guides`/);
  });

  it("gives the Free plan CTA a visible solid border, not a faint one", () => {
    expect(read("src/app/pricing/page.tsx")).toMatch(/OUTLINE_CTA = buttonVariants\(\{[^}]*border-foreground[^/]/);
  });
});

describe("W5 messaging: one meaning of persona, legal facts carry the disclaimer", () => {
  it("does not use the confusing persona costume line on /grade", () => {
    expect(read("src/app/grade/page.tsx")).not.toMatch(/persona costume/);
  });

  it("puts the not-legal-advice line beside the legal claims on /for-agencies", () => {
    const src = read("src/app/for-agencies/page.tsx");
    expect(src).toMatch(/Not legal advice: ask a lawyer/);
    expect(src).not.toMatch(/liability/i);
    expect(src).not.toMatch(/isn&apos;t a defense/);
  });

  it("states hosted behind-login as not built in the agencies Available now list", () => {
    const src = read("src/app/for-agencies/page.tsx");
    expect(src).toMatch(/Available now/);
    expect(src).toMatch(/What founding access funds/);
    expect(src).toMatch(/Not built yet/);
  });

  it("explains persona as an AI agent that tries a task, on home", () => {
    expect(read("src/app/page.tsx")).toMatch(/sends an AI agent to try a task/);
  });
});
