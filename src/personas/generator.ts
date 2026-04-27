import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { chromium } from "playwright";
import { Persona, generateSystemPrompt } from "./types.js";

const personaSchema = z.object({
  personas: z.array(
    z.object({
      id: z.string().describe("kebab-case unique identifier"),
      name: z.string(),
      description: z.string(),
      goals: z.array(z.string()),
      frustrations: z.array(z.string()),
      techProficiency: z.union([
        z.literal(1),
        z.literal(2),
        z.literal(3),
        z.literal(4),
        z.literal(5),
      ]),
      viewport: z.object({ width: z.number(), height: z.number() }),
      isMobile: z.boolean(),
      connectionSpeed: z.enum(["fast", "3g", "slow-3g"]),
      accessibilityNeeds: z.array(z.string()),
      maxSteps: z.number(),
      patienceLevel: z.enum(["low", "medium", "high"]),
    })
  ),
});

interface WebsiteSignals {
  title: string;
  metaDescription: string;
  headings: string[];
  navLinks: string[];
  mainContent: string;
  formFields: string[];
  hasPricing: boolean;
  hasAuth: boolean;
  language: string;
}

async function extractWebsiteSignals(url: string): Promise<WebsiteSignals> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const signals = await page.evaluate(() => {
      const title = document.title || "";
      const metaDesc =
        document
          .querySelector('meta[name="description"]')
          ?.getAttribute("content") || "";

      const headings = Array.from(
        document.querySelectorAll("h1, h2, h3")
      ).map((el) => el.textContent?.trim() || "");

      const navLinks = Array.from(
        document.querySelectorAll("nav a, header a")
      ).map((el) => el.textContent?.trim() || "");

      const mainEl =
        document.querySelector("main") ||
        document.querySelector('[role="main"]') ||
        document.body;
      const mainContent = (mainEl.textContent || "").slice(0, 2000).trim();

      const formFields = Array.from(
        document.querySelectorAll("input, select, textarea")
      ).map(
        (el) =>
          el.getAttribute("name") ||
          el.getAttribute("placeholder") ||
          el.getAttribute("type") ||
          ""
      );

      const bodyText = document.body.textContent?.toLowerCase() || "";
      const hasPricing =
        bodyText.includes("pricing") ||
        bodyText.includes("$/mo") ||
        bodyText.includes("per month") ||
        bodyText.includes("free tier");

      const hasAuth =
        bodyText.includes("sign up") ||
        bodyText.includes("sign in") ||
        bodyText.includes("log in") ||
        !!document.querySelector('[type="password"]');

      const language =
        document.documentElement.getAttribute("lang") || "en";

      return {
        title,
        metaDescription: metaDesc,
        headings: headings.slice(0, 20),
        navLinks: navLinks.slice(0, 20),
        mainContent,
        formFields: formFields.slice(0, 20),
        hasPricing,
        hasAuth,
        language,
      };
    });

    return signals;
  } finally {
    await browser.close();
  }
}

function buildPromptFromSignals(signals: WebsiteSignals, count: number): string {
  return `Based on this website's content and structure, generate ${count} diverse user personas who would realistically use this site.

Website signals:
- Title: ${signals.title}
- Meta description: ${signals.metaDescription}
- Language: ${signals.language}
- Key headings: ${signals.headings.join(", ")}
- Navigation links: ${signals.navLinks.join(", ")}
- Main content (excerpt): ${signals.mainContent.slice(0, 1000)}
- Form fields present: ${signals.formFields.join(", ") || "none"}
- Has pricing info: ${signals.hasPricing}
- Has auth/signup: ${signals.hasAuth}

Requirements:
- Generate exactly ${count} personas with diversity across: tech proficiency (1-5), age range, accessibility needs, device usage (mobile vs desktop), and goals.
- At least 1 persona MUST have accessibility needs (screen reader, colorblind, motor impairment, etc.).
- At least 1 persona should be on mobile with slow connection.
- At least 1 persona should have low tech proficiency.
- Each persona should have realistic goals related to what this specific website offers.
- Use realistic names, ages, and backgrounds.
- Set maxSteps between 10-30 based on patience level.
- Viewports: desktop 1440x900, mobile 375x812 or 390x844.`;
}

export async function generatePersonasFromUrl(
  url: string,
  count: number = 5
): Promise<Persona[]> {
  try {
    const signals = await extractWebsiteSignals(url);
    const prompt = buildPromptFromSignals(signals, count);

    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-20250514"),
      schema: personaSchema,
      prompt,
    });

    return object.personas.map((p) => ({
      ...p,
      systemPrompt: generateSystemPrompt(p),
    }));
  } catch (error) {
    console.error("Persona generation from URL failed:", error);
    return getDefaultPersonas(count);
  }
}

export async function generatePersonasFromDescription(
  description: string,
  count: number = 5
): Promise<Persona[]> {
  try {
    const prompt = `Generate ${count} diverse user personas for this product/audience: ${description}

Requirements:
- Include a range of tech proficiency levels (1-5).
- At least one persona with accessibility needs (screen reader, colorblind, motor impairment, etc.).
- Mix of mobile and desktop users.
- At least one persona on a slow connection.
- At least one persona with low patience.
- Realistic names, ages, backgrounds, and goals specific to this product.
- Set maxSteps between 10-30 based on patience level.
- Viewports: desktop 1440x900, mobile 375x812 or 390x844.`;

    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-20250514"),
      schema: personaSchema,
      prompt,
    });

    return object.personas.map((p) => ({
      ...p,
      systemPrompt: generateSystemPrompt(p),
    }));
  } catch (error) {
    console.error("Persona generation from description failed:", error);
    return getDefaultPersonas(count);
  }
}

function getDefaultPersonas(count: number): Persona[] {
  const defaults: Omit<Persona, "systemPrompt">[] = [
    {
      id: "default-general-user",
      name: "Jordan",
      description: "a 30-year-old professional evaluating this product",
      goals: ["Understand what the product does", "Find pricing", "Evaluate fit for their needs"],
      frustrations: ["Confusing navigation", "Hidden information", "Slow load times"],
      techProficiency: 3,
      viewport: { width: 1440, height: 900 },
      isMobile: false,
      connectionSpeed: "fast",
      accessibilityNeeds: [],
      maxSteps: 20,
      patienceLevel: "medium",
    },
    {
      id: "default-mobile-user",
      name: "Priya",
      description: "a 26-year-old browsing on mobile with limited time",
      goals: ["Quickly find key information", "Complete a task on mobile"],
      frustrations: ["Tiny tap targets", "Slow loading", "Desktop-only features"],
      techProficiency: 3,
      viewport: { width: 375, height: 812 },
      isMobile: true,
      connectionSpeed: "3g",
      accessibilityNeeds: [],
      maxSteps: 15,
      patienceLevel: "low",
    },
    {
      id: "default-accessibility-user",
      name: "Robert",
      description: "a 50-year-old with low vision using screen magnification",
      goals: ["Navigate with screen magnifier", "Read content at 200% zoom", "Complete primary action"],
      frustrations: ["Small text", "Low contrast", "Content that breaks at zoom"],
      techProficiency: 2,
      viewport: { width: 1440, height: 900 },
      isMobile: false,
      connectionSpeed: "fast",
      accessibilityNeeds: ["low-vision", "screen-magnification"],
      maxSteps: 25,
      patienceLevel: "high",
    },
    {
      id: "default-power-user",
      name: "Chen",
      description: "a 35-year-old developer looking for technical details",
      goals: ["Find API documentation", "Check integrations", "Evaluate technical architecture"],
      frustrations: ["Marketing fluff", "No code examples", "Required signup for docs"],
      techProficiency: 5,
      viewport: { width: 1440, height: 900 },
      isMobile: false,
      connectionSpeed: "fast",
      accessibilityNeeds: [],
      maxSteps: 20,
      patienceLevel: "low",
    },
    {
      id: "default-non-technical",
      name: "Barbara",
      description: "a 62-year-old retiree unfamiliar with modern web apps",
      goals: ["Understand what this is", "Find help or support", "Feel safe giving personal info"],
      frustrations: ["Jargon", "Complex forms", "No phone support", "Unclear pricing"],
      techProficiency: 1,
      viewport: { width: 1440, height: 900 },
      isMobile: false,
      connectionSpeed: "fast",
      accessibilityNeeds: [],
      maxSteps: 25,
      patienceLevel: "high",
    },
  ];

  return defaults.slice(0, count).map((p) => ({
    ...p,
    systemPrompt: generateSystemPrompt(p),
  }));
}
