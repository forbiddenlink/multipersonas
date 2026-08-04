/**
 * Marketing sample evidence grounded in a real probe:
 * experiments/net-new-violations/results/saucedemo.json
 * (SauceDemo behind-login / multi-step states a page-level crawler misses).
 * Not a live customer account — labelled as sample everywhere it renders.
 */

export const SAMPLE_TARGET = {
  host: "saucedemo.com",
  label: "SauceDemo probe",
  source: "experiments/net-new-violations",
} as const;

export const SAMPLE_VERDICTS = [
  {
    ruleId: "button-name",
    severity: "critical",
    wcag: "4.1.2",
    help: "Buttons must have discernible text",
    verdict:
      "The error-dismiss control on the checkout validation state exposes no accessible name, so assistive technology announces only “button.” A screen-reader user cannot know what the control does.",
    location: "saucedemo.com — checkout-validation-error",
    state: "/checkout-step-one (validation error)",
  },
  {
    ruleId: "select-name",
    severity: "critical",
    wcag: "4.1.2",
    help: "Select element must have an accessible name",
    verdict:
      "The inventory sort control has no accessible name. Behind auth, a crawler without a session never reaches this state — and never finds the defect.",
    location: "saucedemo.com — inventory (behind auth)",
    state: "/inventory",
  },
] as const;

export const SAMPLE_REPLAY_FRAMES = [
  {
    id: "login-error",
    step: "01",
    state: "/login (error)",
    thought: "Bad credentials — looking for what went wrong.",
    finding: null as null | {
      severity: string;
      ruleId: string;
      wcag: string;
      title: string;
    },
  },
  {
    id: "inventory",
    step: "02",
    state: "/inventory",
    thought: "Behind the login now. Sorting the catalog.",
    finding: {
      severity: "critical",
      ruleId: "select-name",
      wcag: "4.1.2",
      title: "Select element must have an accessible name",
    },
  },
  {
    id: "checkout-error",
    step: "03",
    state: "/checkout (validation)",
    thought: "I can't tell what this button actually does.",
    finding: {
      severity: "critical",
      ruleId: "button-name",
      wcag: "4.1.2",
      title: "Buttons must have discernible text",
    },
  },
] as const;

export const SAMPLE_CONSOLE_RUNS = [
  { host: "saucedemo.com", score: "0/1", tone: "var(--severity-critical)" as const },
  { host: "orangehrmlive.com", score: "1/2", tone: "var(--severity-serious)" as const },
  { host: "the-internet.herokuapp.com", score: "2/2", tone: "var(--severity-minor)" as const },
] as const;

export const SAMPLE_SEVERITY_COUNTS = {
  critical: 3,
  serious: 1,
  moderate: 0,
  minor: 0,
} as const;
