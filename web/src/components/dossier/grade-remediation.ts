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
    wcag: ["4.1.2"],
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
    wcag: [],
    why: "Screen-reader users navigating by landmark have no “main” region to jump to.",
    fix: "Wrap the primary content in a single <main> element (or role=\"main\").",
  },
  "region": {
    title: "Content outside page landmarks",
    wcag: [],
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
    wcag: ["4.1.2"],
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
  "area-alt": {
    title: "Image map areas with no text alternative",
    wcag: ["2.4.4", "4.1.2"],
    why: "A clickable region of an image map has no name, so a screen reader announces a link with no purpose.",
    fix: "Add an alt attribute to every <area> that says where it goes, e.g. alt=\"Pricing page\".",
  },
  "aria-allowed-attr": {
    title: "Accessibility attributes the element doesn't support",
    wcag: ["4.1.2"],
    why: "An ARIA attribute is used on a role that doesn't allow it, so assistive technology may ignore it or announce the wrong thing.",
    fix: "Remove the attribute, or change the element's role to one that supports it (the ARIA spec lists the allowed attributes for each role).",
  },
  "aria-braille-equivalent": {
    title: "Braille labels with no matching text label",
    wcag: ["4.1.2"],
    why: "An element has a braille-specific label but no regular label, so screen reader users who don't use braille get nothing.",
    fix: "Add an aria-label or visible text to the element, and keep aria-braillelabel only as an addition to it.",
  },
  "aria-conditional-attr": {
    title: "Accessibility attributes used in the wrong situation",
    wcag: ["4.1.2"],
    why: "An ARIA attribute is set in a situation where it contradicts the element's real state, so a screen reader reports something untrue.",
    fix: "Remove the attribute, or let the browser's native behavior carry it (e.g. drop aria-checked on a native checkbox).",
  },
  "aria-deprecated-role": {
    title: "Outdated accessibility roles",
    wcag: ["4.1.2"],
    why: "An element uses an ARIA role that has been retired, so assistive technology may not recognize it.",
    fix: "Replace the role with the current one that fits, or use the native HTML element instead.",
  },
  "aria-hidden-body": {
    title: "Whole page hidden from screen readers",
    wcag: ["1.3.1", "4.1.2"],
    why: "aria-hidden=\"true\" on the <body> hides the entire page from screen readers, so they find nothing to read.",
    fix: "Remove aria-hidden from the <body>. Hide only the specific parts that should be skipped.",
  },
  "aria-input-field-name": {
    title: "Custom input fields with no name",
    wcag: ["4.1.2"],
    why: "A custom input (combobox, listbox, slider, textbox and similar) has no accessible name, so a screen reader can't say what to enter.",
    fix: "Add a visible <label>, or an aria-label / aria-labelledby that names the field.",
  },
  "aria-meter-name": {
    title: "Meters with no name",
    wcag: ["1.1.1"],
    why: "A screen reader announces a meter's value with no hint about what is being measured.",
    fix: "Add an aria-label or aria-labelledby that says what the meter shows, e.g. “Disk space used.”",
  },
  "aria-progressbar-name": {
    title: "Progress bars with no name",
    wcag: ["1.1.1"],
    why: "A screen reader announces a progress value with no hint about what is loading or completing.",
    fix: "Add an aria-label or aria-labelledby that says what is in progress, e.g. “Uploading file.”",
  },
  "aria-prohibited-attr": {
    title: "Accessibility attributes that aren't allowed here",
    wcag: ["4.1.2"],
    why: "An ARIA attribute (often aria-label) sits on an element where it is forbidden, so screen readers ignore it and the label is lost.",
    fix: "Move the attribute to an element that supports it, or give the element a role that allows it.",
  },
  "aria-required-children": {
    title: "Custom widgets missing required parts",
    wcag: ["1.3.1"],
    why: "An ARIA role needs certain child elements (a list needs items, a table needs rows), so a screen reader can't describe its structure.",
    fix: "Add the child roles the parent requires (e.g. role=\"listitem\" inside role=\"list\"), or use native HTML elements that include them.",
  },
  "aria-required-parent": {
    title: "Custom widget parts with no parent",
    wcag: ["1.3.1"],
    why: "An element has a child role (such as listitem or tab) but no matching parent, so assistive technology can't place it in a structure.",
    fix: "Wrap the element in the parent role it needs (e.g. role=\"list\" around role=\"listitem\" items), or use native HTML.",
  },
  "aria-roledescription": {
    title: "Custom role descriptions on elements that can't use them",
    wcag: ["4.1.2"],
    why: "aria-roledescription replaces what a screen reader says about an element's type, and on an element with no supported role it can be ignored or confusing.",
    fix: "Remove aria-roledescription, or put it only on an element with a real role.",
  },
  "aria-roles": {
    title: "Invalid accessibility roles",
    wcag: ["4.1.2"],
    why: "An element has a role value that doesn't exist (often a typo), so assistive technology ignores it.",
    fix: "Correct the role to a valid ARIA role, or remove it and use the native HTML element.",
  },
  "aria-tab-name": {
    title: "Tabs with no name",
    wcag: ["4.1.2"],
    why: "A screen reader announces a tab with no label, so a person can't tell tabs apart.",
    fix: "Give each role=\"tab\" element visible text, or an aria-label.",
  },
  "aria-toggle-field-name": {
    title: "Toggles with no name",
    wcag: ["4.1.2"],
    why: "A custom checkbox, switch, or radio has no accessible name, so a screen reader can't say what it turns on or off.",
    fix: "Add visible text, a <label>, or an aria-label that names the setting.",
  },
  "aria-tooltip-name": {
    title: "Tooltips with no name",
    wcag: ["4.1.2"],
    why: "An element with role=\"tooltip\" has no text, so a screen reader announces an empty tooltip.",
    fix: "Put the tooltip text inside the element, or name it with aria-label.",
  },
  "aria-valid-attr": {
    title: "Misspelled accessibility attributes",
    wcag: ["4.1.2"],
    why: "An attribute starting with aria- isn't a real ARIA attribute, so assistive technology ignores it.",
    fix: "Correct the attribute name to a real aria-* attribute, or remove it.",
  },
  "audio-caption": {
    title: "Audio with no captions",
    wcag: ["1.2.1"],
    why: "A deaf or hard-of-hearing visitor has no way to follow audio that has no text version.",
    fix: "Add a <track kind=\"captions\"> to the media, or provide a transcript next to it.",
  },
  "autocomplete-valid": {
    title: "Form fields with invalid autofill hints",
    wcag: ["1.3.5"],
    why: "A personal-data field has an autocomplete value browsers don't recognize, so autofill and password tools can't fill it for people who rely on them.",
    fix: "Set autocomplete to a valid token from the HTML spec, such as \"email\", \"name\", or \"postal-code\".",
  },
  "avoid-inline-spacing": {
    title: "Text spacing locked with !important",
    wcag: ["1.4.12"],
    why: "Inline !important spacing stops people from widening letter, word, and line spacing to make text readable.",
    fix: "Remove !important from inline line-height, letter-spacing, and word-spacing styles, or move them to a stylesheet that can be overridden.",
  },
  "blink": {
    title: "Blinking text",
    wcag: ["2.2.2"],
    why: "Blinking content is hard to read and can't be paused, and it is distracting for people who have trouble focusing.",
    fix: "Remove the <blink> element and any blinking styles or scripts.",
  },
  "bypass": {
    title: "No way to skip repeated navigation",
    wcag: ["2.4.1"],
    why: "A keyboard or screen reader user has to move through the whole menu on every page before reaching the content.",
    fix: "Add a “Skip to main content” link as the first focusable element, or give the page landmarks and a heading structure to jump between.",
  },
  "css-orientation-lock": {
    title: "Page locked to one screen orientation",
    wcag: ["1.3.4"],
    why: "A page that works only in portrait or landscape fails for people whose device is fixed in one position, such as on a wheelchair mount.",
    fix: "Remove CSS that forces one orientation, so the page works in both.",
  },
  "definition-list": {
    title: "Definition lists built with the wrong markup",
    wcag: ["1.3.1"],
    why: "A <dl> contains something other than <dt> and <dd> pairs, so a screen reader can't announce it correctly.",
    fix: "Keep only <dt>, <dd>, and <div> groups of them as direct children of the <dl>.",
  },
  "dlitem": {
    title: "Definition items outside a definition list",
    wcag: ["1.3.1"],
    why: "A <dt> or <dd> sits outside a <dl>, so a screen reader doesn't announce the term and definition relationship.",
    fix: "Move the <dt> and <dd> inside a <dl> element.",
  },
  "form-field-multiple-labels": {
    title: "Form fields with more than one label",
    wcag: ["3.3.2"],
    why: "A field has several labels, and assistive technology may read only one of them or read them in a confusing order.",
    fix: "Keep one <label> per field, and fold any extra text into that label or into aria-describedby.",
  },
  "frame-focusable-content": {
    title: "Frames with keyboard-only content you can't reach",
    wcag: ["2.1.1"],
    why: "A frame with tabindex=\"-1\" holds focusable content, so a keyboard user can never tab into it.",
    fix: "Remove tabindex=\"-1\" from the <frame> or <iframe>, so its content joins the normal tab order.",
  },
  "frame-title-unique": {
    title: "Frames sharing the same title",
    wcag: ["4.1.2"],
    why: "Two frames with the same title sound identical to a screen reader user, who can't tell them apart.",
    fix: "Give every <iframe> its own title that describes its content.",
  },
  "html-lang-valid": {
    title: "Page language code is not valid",
    wcag: ["3.1.1"],
    why: "A screen reader can't pick the right voice and pronunciation when the lang value is not a real language code.",
    fix: "Set the <html> lang attribute to a valid code, such as \"en\" or \"es\".",
  },
  "html-xml-lang-mismatch": {
    title: "Two different page languages declared",
    wcag: ["3.1.1"],
    why: "The lang and xml:lang attributes name different languages, so assistive technology can't tell which one to trust.",
    fix: "Make lang and xml:lang match, or remove xml:lang if the page is plain HTML.",
  },
  "input-image-alt": {
    title: "Image buttons with no text alternative",
    wcag: ["1.1.1", "4.1.2"],
    why: "An <input type=\"image\"> button has no alt text, so a screen reader announces a button with no purpose.",
    fix: "Add an alt attribute that describes the action, such as alt=\"Search\".",
  },
  "label-content-name-mismatch": {
    title: "Visible text missing from the accessible name",
    wcag: ["2.5.3"],
    why: "A voice-control user says the words they see on the button, but the control's accessible name doesn't contain them, so the command fails.",
    fix: "Make the aria-label or accessible name start with the exact visible text, or drop the aria-label.",
  },
  "link-in-text-block": {
    title: "Links only distinguished by color",
    wcag: ["1.4.1"],
    why: "A link inside a paragraph is told apart from the text only by color, so a person who can't see color differences won't spot it.",
    fix: "Add an underline or another visible cue, or keep at least 3:1 contrast between the link and the surrounding text.",
  },
  "marquee": {
    title: "Scrolling marquee text",
    wcag: ["2.2.2"],
    why: "Moving text can't be paused, so it is hard to read and distracting.",
    fix: "Remove the <marquee> element, or show the text as static content.",
  },
  "meta-refresh": {
    title: "Page that refreshes or redirects on a timer",
    wcag: ["2.2.1"],
    why: "A timed refresh can pull a person off the page before they finish reading, especially with a screen reader or slower input.",
    fix: "Remove the meta refresh, or set its delay to 0 for an instant redirect. Use a server redirect when you can.",
  },
  "no-autoplay-audio": {
    title: "Audio that plays on its own",
    wcag: ["1.4.2"],
    why: "Sound that starts by itself talks over a screen reader and can't be silenced without hunting for a control.",
    fix: "Turn off autoplay, or add a visible control to pause or mute the audio, and keep it under 3 seconds if it must autoplay.",
  },
  "object-alt": {
    title: "Embedded objects with no text alternative",
    wcag: ["1.1.1"],
    why: "An <object> element has no accessible name, so a screen reader user gets no hint of what it is.",
    fix: "Add an aria-label, an aria-labelledby, or a title attribute that describes the embedded content.",
  },
  "p-as-heading": {
    title: "Paragraphs styled to look like headings",
    wcag: ["1.3.1"],
    why: "Text made bold or large to act as a heading isn't marked as one, so screen reader users can't jump between sections.",
    fix: "Use a real heading element (<h2>, <h3>, and so on) and style it as needed.",
  },
  "role-img-alt": {
    title: "Image-role elements with no text alternative",
    wcag: ["1.1.1"],
    why: "An element with role=\"img\" has no accessible name, so a screen reader announces an image with no description.",
    fix: "Add an aria-label or aria-labelledby that describes the image.",
  },
  "scrollable-region-focusable": {
    title: "Scrolling areas a keyboard can't reach",
    wcag: ["2.1.1", "2.1.3"],
    why: "A keyboard user can't scroll an area that holds no focusable item, so its content stays out of reach.",
    fix: "Add tabindex=\"0\" to the scrolling container, or make sure it holds a focusable element such as a link.",
  },
  "server-side-image-map": {
    title: "Server-side image maps",
    wcag: ["2.1.1"],
    why: "A server-side image map only responds to mouse clicks at exact positions, so keyboard users can't use it.",
    fix: "Replace it with a client-side map using <map> and <area> elements, or with plain links.",
  },
  "summary-name": {
    title: "Expandable sections with no name",
    wcag: ["4.1.2"],
    why: "A <summary> has no text, so a screen reader announces a toggle with no clue what it opens.",
    fix: "Put visible text inside the <summary>, or give it an aria-label.",
  },
  "table-fake-caption": {
    title: "Table captions faked with a cell",
    wcag: ["1.3.1"],
    why: "A table's title is typed into a spanning cell, so a screen reader doesn't connect it to the table.",
    fix: "Move the title into a <caption> element as the first child of the <table>.",
  },
  "td-has-header": {
    title: "Data cells with no headers",
    wcag: ["1.3.1"],
    why: "In a large table, a screen reader can't say which row or column a cell belongs to when no headers are marked.",
    fix: "Mark header cells with <th> (and scope or headers attributes where needed) so every data cell has one.",
  },
  "td-headers-attr": {
    title: "Table cells pointing to the wrong headers",
    wcag: ["1.3.1"],
    why: "A cell's headers attribute names an id that is missing or isn't a header in the same table, so a screen reader reads the wrong labels.",
    fix: "Make each id in a headers attribute match a <th> or header cell in the same table.",
  },
  "th-has-data-cells": {
    title: "Table headers with no data",
    wcag: ["1.3.1"],
    why: "A <th> doesn't have any data cells to describe, so a screen reader announces a header that labels nothing.",
    fix: "Make sure each <th> has data cells in its row or column, or change it to a <td> if it isn't a header.",
  },
  "valid-lang": {
    title: "Passages with an invalid language code",
    wcag: ["3.1.2"],
    why: "A lang attribute on part of the page isn't a real language code, so a screen reader reads that text in the wrong voice.",
    fix: "Correct the lang value to a valid code such as \"fr\" or \"de\".",
  },
  "video-caption": {
    title: "Videos with no captions",
    wcag: ["1.2.2"],
    why: "A deaf or hard-of-hearing visitor can't follow the speech and sounds in a video that has no captions.",
    fix: "Add a <track kind=\"captions\"> with captions to the <video>, or caption it on the hosting service.",
  },
};

/** Look up remediation text for a rule id; undefined when it isn't in the table yet. */
export function ruleFix(ruleId: string): RuleFix | undefined {
  return RULE_FIXES[ruleId];
}
