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
    location: "saucedemo.com · checkout-validation-error",
    state: "/checkout-step-one (validation error)",
  },
  {
    ruleId: "select-name",
    severity: "critical",
    wcag: "4.1.2",
    help: "Select element must have an accessible name",
    verdict:
      "The inventory sort control has no accessible name. Behind auth, a crawler without a session never reaches this state, so it never finds the defect.",
    location: "saucedemo.com · inventory (behind auth)",
    state: "/inventory",
  },
  {
    // From the probe record: state `login-error`, impact critical, target `button`. The
    // record carries no element detail beyond the selector, so none is claimed here.
    ruleId: "button-name",
    severity: "critical",
    wcag: "4.1.2",
    help: "Buttons must have discernible text",
    verdict:
      "A button on the login error state exposes no accessible name, so assistive technology announces only “button.” The state only exists after a failed sign-in, so a URL-level scan never loads it.",
    location: "saucedemo.com · login (error state)",
    state: "/login (error)",
  },
] as const;

export const SAMPLE_REPLAY_FRAMES = [
  {
    id: "login-error",
    step: "01",
    state: "/login (error)",
    action: "submit credentials",
    frustration: 18,
    target: null,
    thought: "Bad credentials. Looking for what went wrong.",
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
    action: "sort product catalog",
    frustration: 52,
    target: 'select[data-test="product_sort_container"]',
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
    state: "/checkout (error)",
    action: "dismiss error message",
    frustration: 89,
    target: "button.error-button",
    thought: "I can't tell what this button actually does.",
    finding: {
      severity: "critical",
      ruleId: "button-name",
      wcag: "4.1.2",
      title: "Buttons must have discernible text",
    },
  },
] as const;

// Matches experiments/net-new-violations/results/saucedemo.json: three net-new
// violations, all critical (button-name x2, select-name), none on the public page.
export const SAMPLE_SEVERITY_COUNTS = {
  critical: 3,
  serious: 0,
  moderate: 0,
  minor: 0,
} as const;
