/**
 * User-visible changes, newest first. Hand-curated from merged pull requests: dependency
 * bumps, CI changes, and internal refactors are left out. Add an entry by putting one
 * object at the top of the array. `date` is the merge date (ISO, UTC). `pr` links the entry
 * to its pull request on GitHub.
 */
export type ChangelogEntry = {
  date: string;
  text: string;
  pr: number;
};

export const CHANGELOG_PR_BASE = "https://github.com/forbiddenlink/multipersonas/pull";

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-10-09",
    text: "Fixed duplicate checkouts, and audits that did not finish are no longer claimed as complete.",
    pr: 160,
  },
  {
    date: "2026-10-06",
    text: "The free grade now grades the section of a site you entered, not its parent site.",
    pr: 158,
  },
  {
    date: "2026-10-05",
    text: "Signed-in app: Exhibit letters and serial numbers removed, priority scores show their formula, and persona cards list the full description and all goals.",
    pr: 157,
  },
  {
    date: "2026-10-05",
    text: "Exported reports open with an executive summary that includes changes since the previous scan. Criteria are labeled Fails automated checks, Passes automated checks, or Needs manual review.",
    pr: 156,
  },
  {
    date: "2026-10-05",
    text: "The free grade explains every WCAG axe rule in plain language.",
    pr: 155,
  },
  {
    date: "2026-10-05",
    text: "The free grade asks you to tick the human-check box instead of reporting a failed check.",
    pr: 153,
  },
  {
    date: "2026-10-05",
    text: "Scheduled scans email their result.",
    pr: 152,
  },
  {
    date: "2026-10-04",
    text: "The plan's project limit is now enforced in the database.",
    pr: 147,
  },
  {
    date: "2026-10-04",
    text: "Email confirmation links verify on personaudit.com.",
    pr: 146,
  },
  {
    date: "2026-10-04",
    text: "Paid runs link to the saved run and report, and a Retest button re-runs an audit. Dashboard runs can be attached to a project.",
    pr: 143,
  },
  {
    date: "2026-10-04",
    text: "A first-run checklist on the Free dashboard: grade, save as a project, re-grade.",
    pr: 142,
  },
  {
    date: "2026-10-04",
    text: "Clearer messaging for agencies and freelancers.",
    pr: 141,
  },
  {
    date: "2026-10-04",
    text: "The grade result lists the first three rules to fix, states what automated checks cover, and offers to save and re-grade.",
    pr: 140,
  },
  {
    date: "2026-10-04",
    text: "Free plan copy corrected, and dead ends removed.",
    pr: 138,
  },
  {
    date: "2026-10-04",
    text: "GitHub sign-in appears only when it works.",
    pr: 137,
  },
  {
    date: "2026-10-04",
    text: "The CLI ships as personaudit, with GitHub Action outputs and a security policy.",
    pr: 136,
  },
  {
    date: "2026-10-04",
    text: "Free projects include a free grade with history.",
    pr: 135,
  },
  {
    date: "2026-10-04",
    text: "Each finding in a grade shows the located element, with its selector and HTML.",
    pr: 134,
  },
  {
    date: "2026-10-04",
    text: "The pricing page compares plans side by side.",
    pr: 133,
  },
  {
    date: "2026-10-04",
    text: "Grade result page: proper headings, completion announced to screen readers, share links, and progress that reflects the real job state.",
    pr: 131,
  },
  {
    date: "2026-10-04",
    text: "Grades score only WCAG A and AA findings, so clean pages stop receiving a D.",
    pr: 127,
  },
  {
    date: "2026-10-02",
    text: "New visual design for the site and app.",
    pr: 121,
  },
  {
    date: "2026-10-01",
    text: "Design and QA pass across mobile layouts, the grade report, and print.",
    pr: 119,
  },
  {
    date: "2026-09-28",
    text: "Audit recovery keeps a queued grade after a session refresh, and cached results no longer carry over between accounts.",
    pr: 116,
  },
  {
    date: "2026-09-27",
    text: "Persona replay and state-flow trail redesigned.",
    pr: 110,
  },
  {
    date: "2026-09-26",
    text: "Removed the open-ended refund promise on founding access.",
    pr: 107,
  },
  {
    date: "2026-09-26",
    text: "First version of the evidence dossier design and a full product walkthrough.",
    pr: 106,
  },
];
