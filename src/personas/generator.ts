import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { launchAuditBrowser } from "../security/browser.js";
import { Persona, generateSystemPrompt } from "./types.js";
import { DEFAULT_MODEL } from "../agent/engine.js";
import { assertUrlAllowed, assertRequestAllowed } from "../security/url-guard.js";

export class PersonaGenerationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PersonaGenerationError";
  }
}

/**
 * The model sometimes returns the persona list as a JSON *string* rather than an
 * array — `{"personas": "{\"personas\": [...]}"}`, double-encoded and sometimes
 * re-wrapped. Observed against a real target on 2026-07-16; strict validation
 * rejected a perfectly good set of personas and the caller silently fell back to
 * generic ones. Unwrap it here rather than lose the work.
 */
export function coercePersonaList(value: unknown): unknown {
  let v = value;
  for (let i = 0; i < 3 && typeof v === "string"; i++) {
    try {
      v = JSON.parse(v);
    } catch {
      return value; // not JSON — hand it back and let validation report properly
    }
  }
  // Unwrap a re-nested {personas: [...]} envelope.
  while (v && typeof v === "object" && !Array.isArray(v) && "personas" in v) {
    v = (v as { personas: unknown }).personas;
  }
  return v;
}

const personaSchema = z.object({
  personas: z.preprocess(
    coercePersonaList,
    z.array(
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
      maxSteps: z.number().int().min(1).max(50),
      patienceLevel: z.enum(["low", "medium", "high"]),
    }),
    ),
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

async function extractWebsiteSignals(
  url: string,
  options: GenerateOptions = {},
): Promise<WebsiteSignals> {
  const safeUrl = await assertUrlAllowed(url, { allowPrivate: options.allowPrivate });
  const browser = await launchAuditBrowser({ headless: true });
  // Generate from the app, not from its login form. Without the session the
  // model only ever sees "Sign in", so it invents prospective-buyer personas who
  // then hunt for a pricing page inside a dashboard (observed 2026-07-16).
  const context = await browser.newContext(
    options.sessionFile ? { storageState: options.sessionFile } : {},
  );

  // Guard every request, not just the initial URL: this navigates a stranger-supplied
  // target and a 302 to a private/metadata host (or a subresource to one) would
  // otherwise be followed and read into the model prompt. Mirrors crawler/grader/engine.
  await context.route("**/*", async (route, request) => {
    const allowed = await assertRequestAllowed(request.url(), request.resourceType(), {
      allowPrivate: options.allowPrivate,
    });
    return allowed ? route.continue() : route.abort("blockedbyclient");
  });

  const page = await context.newPage();

  try {
    await page.goto(safeUrl.href, { waitUntil: "domcontentloaded", timeout: 30000 });

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
- Generate exactly ${count} personas with diversity across: tech proficiency (1-5), age range, device usage (mobile vs desktop), and goals.
- At least 1 persona should be on mobile with slow connection.
- At least 1 persona should have low tech proficiency.
- Each persona should have realistic goals related to what this specific website offers.
- Use realistic names, ages, and backgrounds.
- Set maxSteps between 10-30 based on patience level.
- Viewports: desktop 1440x900, mobile 375x812 or 390x844.

DO NOT give any persona a disability, impairment, or assistive-technology need.
These personas report usability opinion only. Accessibility is measured separately
by a deterministic scanner (axe-core) at every state reached, and by the
keyboard-traversal profile — never by a model roleplaying a disabled person, which
is both inaccurate and harmful. Do not mention screen readers, blindness, colour
blindness, or motor impairment.`;
}

export interface GenerateOptions {
  /** Forwarded to the URL guard; CLI-only, never set by the hosted service. */
  allowPrivate?: boolean;
  /** Saved session, so personas are derived from the signed-in app. */
  sessionFile?: string;
}

export async function generatePersonasFromUrl(
  url: string,
  count: number = 5,
  options: GenerateOptions = {},
): Promise<Persona[]> {
  try {
    const signals = await extractWebsiteSignals(url, options);
    const prompt = buildPromptFromSignals(signals, count);

    const { object } = await generateObject({
      model: anthropic(process.env.MULTIPERSONAS_MODEL || DEFAULT_MODEL),
      schema: personaSchema,
      prompt,
      maxOutputTokens: 4096,
    });

    return object.personas.map((p) => {
      const persona = {
        ...p,
        kind: "ux" as const,
        inputModality: "pointer" as const,
      };
      return { ...persona, systemPrompt: generateSystemPrompt(persona) };
    });
  } catch (error) {
    // Do not quietly hand back generic personas. They are written for a public
    // marketing page, so against an application they hunt for a pricing page
    // inside a dashboard and file findings about its absence — which is what
    // happened on 2026-07-16, while the run still looked successful. A caller
    // that wants the generic set can ask for it; it must not arrive by accident.
    throw new PersonaGenerationError(
      `Could not build personas from ${url}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
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
- Mix of mobile and desktop users.
- At least one persona on a slow connection.
- At least one persona with low patience.
- Realistic names, ages, backgrounds, and goals specific to this product.
- Set maxSteps between 10-30 based on patience level.
- Viewports: desktop 1440x900, mobile 375x812 or 390x844.

DO NOT give any persona a disability, impairment, or assistive-technology need.
These personas report usability opinion only. Accessibility is measured separately
by a deterministic scanner (axe-core) at every state reached, and by the
keyboard-traversal profile — never by a model roleplaying a disabled person, which
is both inaccurate and harmful. Do not mention screen readers, blindness, colour
blindness, or motor impairment.`;

    const { object } = await generateObject({
      model: anthropic(process.env.MULTIPERSONAS_MODEL || DEFAULT_MODEL),
      schema: personaSchema,
      prompt,
      maxOutputTokens: 4096,
    });

    return object.personas.map((p) => {
      const persona = {
        ...p,
        kind: "ux" as const,
        inputModality: "pointer" as const,
      };
      return { ...persona, systemPrompt: generateSystemPrompt(persona) };
    });
  } catch (error) {
    // Same reasoning as generatePersonasFromUrl: silently substituting generic
    // personas for the ones the caller described produces a plausible-looking
    // report about the wrong user entirely.
    throw new PersonaGenerationError(
      `Could not build personas from that description: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

