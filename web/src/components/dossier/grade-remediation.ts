/**
 * Plain-language "what it means" / "how to fix it" text for the axe-core rules a
 * public grade most commonly finds, keyed by axe rule id. WCAG codes here match
 * axe-core's own published rule-to-criterion mapping (deque/axe-core rule metadata) —
 * they are not derived from a scan's tags, since `GradeRuleHit` does not carry them.
 * A rule id not in this table has no invented citation: the page falls back to the
 * rule's own `help` text and its WCAG A/AA flag only. Extend this table as new rule
 * ids show up in real scans; never guess a WCAG code for a rule not verified here.
 */
export interface RuleFix {
  /** Plain-language name for the problem, shown instead of the axe rule id. */
  title: string;
  /** WCAG 2.x success-criterion codes this axe rule maps to. */
  wcag: string[];
  /** One sentence: what breaks for a real user. */
  why: string;
  /** One or two sentences: the concrete fix. */
  fix: string;
}

export const RULE_FIXES: Record<string, RuleFix> = {
  "button-name": {
    title: "Buttons with no name",
    wcag: ["4.1.2"],
    why: "A screen reader announces the control as just “button,” with no clue what it does.",
    fix: "Give the button visible text, or an aria-label / aria-labelledby that names its action.",
  },
  "select-name": {
    title: "Dropdowns with no label",
    wcag: ["4.1.2"],
    why: "A screen reader can't tell a person what the dropdown selects.",
    fix: "Associate a visible <label> with the <select>, or add an aria-label naming what it controls.",
  },
  "input-button-name": {
    title: "Form buttons with no name",
    wcag: ["4.1.2"],
    why: "An input-type button (submit/reset/button) has no accessible name to announce.",
    fix: "Set a value attribute with real text, or add an aria-label.",
  },
  "link-name": {
    title: "Links with no name",
    wcag: ["2.4.4", "4.1.2"],
    why: "A screen reader reads the link with no destination or purpose, often just the icon or nothing at all.",
    fix: "Add visible link text describing where it goes, or an aria-label if the visual design can't change.",
  },
  "image-alt": {
    title: "Images missing alt text",
    wcag: ["1.1.1"],
    why: "A screen-reader user gets no description of an image that carries meaning.",
    fix: "Add an alt attribute describing the image's content or purpose, or alt=\"\" if it's purely decorative.",
  },
  "label": {
    title: "Form fields with no label",
    wcag: ["1.3.1", "4.1.2"],
    why: "A form field has no programmatic label, so assistive technology can't announce what to enter.",
    fix: "Wrap the field in a <label>, or connect one with a for/id pair or aria-labelledby.",
  },
  "color-contrast": {
    title: "Text that is hard to read",
    wcag: ["1.4.3"],
    why: "Text is too close in luminance to its background for low-vision readers to see reliably.",
    fix: "Darken the text or lighten the background until the contrast ratio reaches 4.5:1 (3:1 for large text).",
  },
  "aria-hidden-focus": {
    title: "Hidden content you can still tab to",
    wcag: ["4.1.2"],
    why: "A focusable control is hidden from assistive technology, so a keyboard user can tab to something screen readers never announce.",
    fix: "Remove aria-hidden from the element, or remove it from the tab order (tabindex=\"-1\") if it should stay hidden.",
  },
  "aria-command-name": {
    title: "Custom controls with no name",
    wcag: ["4.1.2"],
    why: "A button, link, or menuitem role has no accessible name.",
    fix: "Add visible text or an aria-label to the element carrying the ARIA role.",
  },
  "aria-required-attr": {
    title: "Custom controls missing required settings",
    wcag: ["4.1.2"],
    why: "An ARIA role is missing an attribute assistive technology needs to represent its state.",
    fix: "Add the required aria-* attribute the role's specification lists (e.g. aria-checked on role=\"checkbox\").",
  },
  "aria-valid-attr-value": {
    title: "Accessibility attributes with invalid values",
    wcag: ["4.1.2"],
    why: "An ARIA attribute has a value assistive technology can't interpret.",
    fix: "Set the attribute to a value its ARIA spec allows (e.g. \"true\"/\"false\", or an id that exists on the page).",
  },
  "duplicate-id-aria": {
    title: "Duplicate IDs used by labels",
    wcag: ["4.1.2"],
    why: "Two elements share an id used by an ARIA relationship, so assistive technology can't tell which one is meant.",
    fix: "Make every id referenced by aria-labelledby, aria-describedby, or aria-controls unique on the page.",
  },
  "html-has-lang": {
    title: "Page language not set",
    wcag: ["3.1.1"],
    why: "Assistive technology can't choose the right pronunciation and voice without knowing the page's language.",
    fix: "Add a lang attribute to the <html> element, e.g. <html lang=\"en\">.",
  },
  "document-title": {
    title: "Page has no title",
    wcag: ["2.4.2"],
    why: "A screen-reader user opening a new tab hears no title identifying the page.",
    fix: "Give the page a descriptive <title>, unique from other pages on the site.",
  },
  "landmark-one-main": {
    title: "No main landmark on the page",
    wcag: ["1.3.1"],
    why: "Screen-reader users navigating by landmark have no “main” region to jump to.",
    fix: "Wrap the primary content in a single <main> element (or role=\"main\").",
  },
  "region": {
    title: "Content outside page landmarks",
    wcag: ["1.3.1"],
    why: "Some content sits outside any landmark region, so landmark navigation skips it entirely.",
    fix: "Move the content into an existing landmark (header, nav, main, footer) or wrap it in one.",
  },
  "list": {
    title: "Lists built with the wrong markup",
    wcag: ["1.3.1"],
    why: "A <ul>/<ol> contains something other than <li> children, so screen readers can't announce it as a list.",
    fix: "Keep only <li> elements as direct children of the list, and move other markup inside an <li>.",
  },
  "listitem": {
    title: "List items outside a list",
    wcag: ["1.3.1"],
    why: "An <li> exists outside a <ul>/<ol>, so its list membership is never announced.",
    fix: "Move the <li> inside a <ul> or <ol> parent.",
  },
  "frame-title": {
    title: "Embedded frames with no title",
    wcag: ["2.4.1", "4.1.2"],
    why: "An <iframe> has no title, so assistive technology announces it as an unlabeled frame.",
    fix: "Add a title attribute describing the frame's content.",
  },
  "svg-img-alt": {
    title: "Graphics with no text alternative",
    wcag: ["1.1.1"],
    why: "An <svg> used as an image has no accessible name for assistive technology.",
    fix: "Add role=\"img\" plus an aria-label, or a <title> element inside the SVG.",
  },
  "nested-interactive": {
    title: "Controls nested inside controls",
    wcag: ["4.1.2"],
    why: "One interactive control is nested inside another, which assistive technology and some browsers can't operate reliably.",
    fix: "Flatten the markup so interactive elements (links, buttons, inputs) don't contain each other.",
  },
  "meta-viewport": {
    title: "Pinch-zoom is blocked",
    wcag: ["1.4.4"],
    why: "The viewport meta tag blocks pinch-zoom, so low-vision users can't magnify the page.",
    fix: "Remove user-scalable=no and any maximum-scale below 5 from the viewport meta tag.",
  },
  "target-size": {
    title: "Tap targets too small",
    wcag: ["2.5.8"],
    why: "A control is smaller than the minimum touch target, which is hard for low-dexterity and motor-impaired users to hit.",
    fix: "Increase the control's clickable area to at least 24×24 CSS pixels, or add enough spacing around it.",
  },
};

/** Look up remediation text for a rule id; undefined when it isn't in the table yet. */
export function ruleFix(ruleId: string): RuleFix | undefined {
  return RULE_FIXES[ruleId];
}
