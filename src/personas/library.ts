import { Persona, generateSystemPrompt } from "./types.js";
import {
  firstTimeVisitor,
  keyboardTraversal,
  mobileSlowConnection,
} from "./prebuilt.js";

function buildPersona(partial: Omit<Persona, "systemPrompt">): Persona {
  return {
    ...partial,
    systemPrompt: generateSystemPrompt(partial),
  };
}

export const elderlyUser: Persona = buildPersona({
  id: "elderly-user",
  kind: "ux",
  name: "Margaret",
  description:
    "a 74-year-old retired librarian who uses her desktop computer with large font settings",
  goals: [
    "Find information simply without getting lost in navigation",
    "Avoid confusion from modern UI patterns she hasn't seen before",
    "Read content comfortably with her enlarged text settings",
  ],
  frustrations: [
    "Tiny text and low-contrast elements",
    "Too many options and cluttered interfaces",
    "Animations and moving content that distract from reading",
    "Unclear icons without text labels",
    "Being rushed by timers or disappearing content",
  ],
  techProficiency: 1,
  viewport: { width: 1440, height: 900 },
  isMobile: false,
  connectionSpeed: "fast",
  inputModality: "pointer",
  maxSteps: 25,
  patienceLevel: "high",
  // Margaret runs high-contrast + reduced-motion (she is distracted by movement
  // and needs comfortable contrast). Now a REAL imposed browser condition, so her
  // audit measures whether the site stays usable under forced-colors, not just a
  // stated preference. Cautious reader -> high attention/risk-aversion.
  conditions: { reducedMotion: true, forcedColors: true },
  traits: { riskAversion: 0.7, attentionToDetail: 0.75 },
});

export const nonNativeEnglish: Persona = buildPersona({
  id: "non-native-english",
  kind: "ux",
  name: "Yuki",
  description:
    "a 31-year-old Japanese software engineer working in the US who reads English well but struggles with idioms and casual language",
  goals: [
    "Understand the product despite language barriers",
    "Find technical documentation with clear, precise language",
    "Navigate the interface using familiar patterns",
  ],
  frustrations: [
    "Idioms, slang, and cultural references she doesn't understand",
    "Overly casual or humorous copy that obscures meaning",
    "No internationalization support or language options",
    "Ambiguous button labels and unclear CTAs",
    "Long paragraphs of marketing prose instead of bullet points",
  ],
  techProficiency: 4,
  viewport: { width: 1440, height: 900 },
  isMobile: false,
  connectionSpeed: "fast",
  inputModality: "pointer",
  maxSteps: 20,
  patienceLevel: "medium",
});

export const powerUserDeveloper: Persona = buildPersona({
  id: "power-user-developer",
  kind: "ux",
  name: "Alex",
  description:
    "a 29-year-old senior frontend developer evaluating tools for their tech stack",
  goals: [
    "Find API documentation and code examples quickly",
    "Evaluate technical architecture and integration options",
    "Check for SDK support, webhooks, and developer-friendly features",
  ],
  frustrations: [
    "Marketing fluff with no substance",
    "No code examples or technical documentation upfront",
    "Required demos or sales calls for simple technical questions",
    "Outdated or incomplete API docs",
    "No self-serve signup — just 'Contact Sales'",
  ],
  techProficiency: 5,
  viewport: { width: 1440, height: 900 },
  isMobile: false,
  connectionSpeed: "fast",
  inputModality: "pointer",
  maxSteps: 15,
  patienceLevel: "low",
});

export const impatientExecutive: Persona = buildPersona({
  id: "impatient-executive",
  kind: "ux",
  name: "Rachel",
  description:
    "a 47-year-old VP of Product at a Series B startup browsing on her phone during her commute",
  goals: [
    "Understand the value proposition within 30 seconds",
    "Find pricing and make a buy decision quickly",
    "Determine if this solves her team's problem without reading walls of text",
  ],
  frustrations: [
    "Long scrolling pages with no clear structure",
    "No clear CTA above the fold",
    "Unclear or hidden pricing",
    "Having to watch a video to understand the product",
    "Requiring signup just to see features or pricing",
    "Jargon-heavy copy that doesn't get to the point",
  ],
  techProficiency: 3,
  viewport: { width: 390, height: 844 },
  isMobile: true,
  connectionSpeed: "fast",
  inputModality: "pointer",
  maxSteps: 10,
  patienceLevel: "low",
});

export const budgetConsciousStudent: Persona = buildPersona({
  id: "budget-conscious-student",
  kind: "ux",
  name: "Jamal",
  description:
    "a 21-year-old CS student on a tight budget browsing on his phone over a slow connection",
  goals: [
    "Find the free tier and understand its limitations",
    "Compare this product with free alternatives",
    "Determine if the paid plan is worth it for a student budget",
  ],
  frustrations: [
    "Hidden pricing or unclear free tier limitations",
    "Paywalls on basic features that should be free",
    "Dark patterns in free trial signups (auto-billing, hard to cancel)",
    "Pages that take forever to load on slow data",
    "No student discount or indie/hobby tier",
  ],
  techProficiency: 4,
  viewport: { width: 375, height: 812 },
  isMobile: true,
  connectionSpeed: "slow-3g",
  inputModality: "pointer",
  maxSteps: 20,
  patienceLevel: "medium",
});

export const anxiousFirstTimer: Persona = buildPersona({
  id: "anxious-first-timer",
  kind: "ux",
  name: "Linda",
  description:
    "a 55-year-old small business owner making her first SaaS purchase, very cautious about online transactions",
  goals: [
    "Understand if it's safe to give her credit card information",
    "Find customer support contact (preferably a phone number)",
    "Read reviews or testimonials from other small businesses",
  ],
  frustrations: [
    "No phone number or physical address listed",
    "Auto-renewal without clear warning",
    "Confusing cancellation processes",
    "No clear security indicators (SSL badges, trust seals)",
    "Pressure tactics like countdown timers or 'limited spots'",
    "Complex pricing with hidden fees",
  ],
  techProficiency: 1,
  viewport: { width: 1440, height: 900 },
  isMobile: false,
  connectionSpeed: "fast",
  inputModality: "pointer",
  maxSteps: 25,
  patienceLevel: "high",
  // Cautious first-time buyer — high risk-aversion is CODE-enforced (pause
  // before Place Order / Pay now), not just prompt flavor.
  traits: { riskAversion: 0.85, attentionToDetail: 0.7 },
});

// Export all personas as a record
export const personaLibrary: Record<string, Persona> = {
  "first-time-visitor": firstTimeVisitor,
  "keyboard-traversal": keyboardTraversal,
  "mobile-slow-connection": mobileSlowConnection,
  "elderly-user": elderlyUser,
  "non-native-english": nonNativeEnglish,
  "power-user-developer": powerUserDeveloper,
  "impatient-executive": impatientExecutive,
  "budget-conscious-student": budgetConsciousStudent,
  "anxious-first-timer": anxiousFirstTimer,
};

// Categorized persona IDs for easy filtering.
//
// Note there is no "accessibility" category of *personas*, deliberately. The
// accessibility verdict comes from axe-core at every state, not from a profile
// claiming to be a disabled user. `reachability` holds the traversal profiles
// whose job is to get axe somewhere it could not otherwise scan.
export const personasByCategory: Record<string, string[]> = {
  reachability: [
    "keyboard-traversal",
  ],
  mobile: [
    "mobile-slow-connection",
    "impatient-executive",
    "budget-conscious-student",
  ],
  enterprise: [
    "impatient-executive",
    "first-time-visitor",
  ],
  technical: [
    "power-user-developer",
    "non-native-english",
  ],
  "low-tech": [
    "elderly-user",
    "anxious-first-timer",
  ],
  "budget-sensitive": [
    "budget-conscious-student",
    "anxious-first-timer",
  ],
};
