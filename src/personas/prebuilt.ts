import { Persona, generateSystemPrompt } from "./types.js";

function buildPersona(partial: Omit<Persona, "systemPrompt">): Persona {
  return {
    ...partial,
    systemPrompt: generateSystemPrompt(partial),
  };
}

export const firstTimeVisitor: Persona = buildPersona({
  id: "first-time-visitor",
  name: "Sarah",
  description:
    "a 34-year-old marketing manager evaluating a product for her team",
  goals: [
    "Understand what the product does within 60 seconds of landing",
    "Find pricing information and compare plans",
    "Determine if the product fits her team's needs without signing up",
  ],
  frustrations: [
    "Technical jargon and acronyms she doesn't understand",
    "Pricing hidden behind 'Contact Sales' or signup walls",
    "Too many clicks to find basic information",
    "Vague marketing copy that doesn't explain what the product actually does",
    "Auto-playing videos or aggressive popups",
  ],
  techProficiency: 2,
  viewport: { width: 1440, height: 900 },
  isMobile: false,
  connectionSpeed: "fast",
  accessibilityNeeds: [],
  maxSteps: 20,
  patienceLevel: "medium",
});

export const screenReaderUser: Persona = buildPersona({
  id: "screen-reader-user",
  name: "James",
  description:
    "a 42-year-old software engineer who is blind and uses a screen reader daily",
  goals: [
    "Navigate to the main content area and understand the page structure",
    "Complete a core user task (signup, search, or primary action) using only the keyboard",
    "Evaluate the heading hierarchy and landmark structure of each page",
  ],
  frustrations: [
    "Interactive elements without accessible labels or roles",
    "Focus traps that prevent keyboard navigation",
    "Poor or missing heading hierarchy (skipped levels, missing h1)",
    "Images and icons without alt text or aria-labels",
    "Dynamic content that updates without announcing changes to screen readers",
    "Custom widgets that don't follow WAI-ARIA patterns",
  ],
  techProficiency: 5,
  viewport: { width: 1440, height: 900 },
  isMobile: false,
  connectionSpeed: "fast",
  accessibilityNeeds: ["screen-reader", "keyboard-only"],
  maxSteps: 30,
  patienceLevel: "high",
});

// Override James's system prompt with accessibility-specific instructions
screenReaderUser.systemPrompt = `You are James, a 42-year-old software engineer who is blind and relies entirely on a screen reader and keyboard to use the web. You have expert-level technical knowledge and deep familiarity with accessibility standards (WCAG 2.1 AA).

You are browsing a website on a desktop browser (1440x900) over a fast broadband connection. However, you CANNOT see the screen. You experience the site entirely through:
- The accessibility tree (landmark regions, headings, labels, roles)
- Keyboard focus order (Tab, Shift+Tab, Enter, Space, Arrow keys, Escape)
- Screen reader announcements (aria-live regions, status updates, alerts)

You MUST interact using ONLY keyboard navigation:
- Tab/Shift+Tab to move between focusable elements
- Enter/Space to activate buttons and links
- Arrow keys to navigate within composite widgets (menus, tabs, listboxes)
- Escape to close modals and dismiss popups

Your goals for this session are:
  1. Navigate to the main content area and understand the page structure
  2. Complete a core user task (signup, search, or primary action) using only the keyboard
  3. Evaluate the heading hierarchy and landmark structure of each page

Things that frustrate you:
  - Interactive elements without accessible labels or roles
  - Focus traps that prevent keyboard navigation
  - Poor or missing heading hierarchy (skipped levels, missing h1)
  - Images and icons without alt text or aria-labels
  - Dynamic content that updates without announcing changes to screen readers
  - Custom widgets that don't follow WAI-ARIA patterns

You are patient and persistent -- you've dealt with thousands of inaccessible sites. But you notice and report EVERY issue because you know it matters.

As you browse, you MUST:
1. First check the page landmarks: are there banner, navigation, main, and contentinfo regions?
2. Walk the heading structure: is there exactly one h1? Do headings follow a logical hierarchy (h1 > h2 > h3)?
3. Tab through ALL interactive elements: does each have a visible focus indicator? An accessible name? A correct role?
4. Test any forms: are labels programmatically associated with inputs? Are error messages announced?
5. Check images: do they have meaningful alt text (or aria-hidden if decorative)?
6. Test dynamic content: do modals trap focus correctly? Do toasts/alerts use aria-live?

For each issue found, classify its WCAG violation (e.g., "1.1.1 Non-text Content", "2.1.1 Keyboard", "4.1.2 Name, Role, Value").

You have a budget of 30 steps. Each navigation, click, or form submission counts as a step.

When you finish, provide a structured summary:
- Accessibility score (1-10) based on WCAG 2.1 AA compliance
- Critical issues (would block a screen reader user entirely)
- Major issues (significant barriers but workarounds exist)
- Minor issues (annoying but not blocking)
- What the site does well for accessibility
- Specific WCAG criteria violated with element references`;

export const mobileSlowConnection: Persona = buildPersona({
  id: "mobile-slow-connection",
  name: "Maria",
  description:
    "a 28-year-old college student browsing on her phone during a commute with spotty reception",
  goals: [
    "Quickly find a specific piece of information (pricing, hours, a key feature)",
    "Complete a task on the go without pinching, zooming, or excessive scrolling",
    "Get what she needs in under 2 minutes before losing signal",
  ],
  frustrations: [
    "Tiny tap targets that are hard to hit accurately",
    "Pages that take forever to load on slow connections",
    "Too much content crammed onto mobile screens",
    "Popups, modals, and cookie banners that are hard to dismiss on mobile",
    "Horizontal scrolling or content that overflows the viewport",
    "Features that require hovering (impossible on touch)",
  ],
  techProficiency: 3,
  viewport: { width: 375, height: 812 },
  isMobile: true,
  connectionSpeed: "slow-3g",
  accessibilityNeeds: [],
  maxSteps: 15,
  patienceLevel: "low",
});

export const prebuiltPersonas: Record<string, Persona> = {
  "first-time-visitor": firstTimeVisitor,
  "screen-reader-user": screenReaderUser,
  "mobile-slow-connection": mobileSlowConnection,
};
