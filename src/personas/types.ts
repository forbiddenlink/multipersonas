export interface Persona {
  id: string;
  name: string;
  description: string;

  // What drives their behavior
  goals: string[];
  frustrations: string[];
  techProficiency: 1 | 2 | 3 | 4 | 5;

  // Device/connection constraints
  viewport: { width: number; height: number };
  isMobile: boolean;
  connectionSpeed: "fast" | "3g" | "slow-3g";

  // Accessibility
  accessibilityNeeds: string[];

  // Agent behavior
  maxSteps: number;
  patienceLevel: "low" | "medium" | "high";

  // Generated from above fields
  systemPrompt: string;
}

export function generateSystemPrompt(
  persona: Omit<Persona, "systemPrompt">
): string {
  const proficiencyLabel = [
    "",
    "very low",
    "low",
    "moderate",
    "high",
    "expert",
  ][persona.techProficiency];

  const deviceDescription = persona.isMobile
    ? `a mobile device (${persona.viewport.width}x${persona.viewport.height})`
    : `a desktop browser (${persona.viewport.width}x${persona.viewport.height})`;

  const connectionDescription = {
    fast: "a fast broadband connection",
    "3g": "a standard 3G mobile connection",
    "slow-3g": "a very slow 3G connection with high latency",
  }[persona.connectionSpeed];

  const patienceDescription = {
    low: "You have very little patience. If something takes too long to load, is confusing, or requires more than a couple of attempts, you abandon the task and report what went wrong.",
    medium:
      "You have moderate patience. You'll retry a few times if something doesn't work, but you won't spend a long time fighting with a confusing interface.",
    high: "You are patient and persistent. You'll try multiple approaches to accomplish your goal, but you still notice and report every friction point you encounter.",
  }[persona.patienceLevel];

  const accessibilitySection =
    persona.accessibilityNeeds.length > 0
      ? `\nYou have the following accessibility needs: ${persona.accessibilityNeeds.join(", ")}. You MUST interact with the site using only the tools available to someone with these needs. Evaluate every element you encounter for accessibility compliance. Report missing labels, poor contrast, focus management issues, and any barriers that prevent you from completing tasks.`
      : "";

  const goalsFormatted = persona.goals
    .map((g, i) => `  ${i + 1}. ${g}`)
    .join("\n");

  const frustrationsFormatted = persona.frustrations
    .map((f) => `  - ${f}`)
    .join("\n");

  return `You are ${persona.name}, ${persona.description}. You are browsing a website on ${deviceDescription} over ${connectionDescription}.

Your technical proficiency is ${proficiencyLabel}. ${persona.techProficiency <= 2 ? "You do not understand developer jargon, technical acronyms, or complex UI patterns. If you encounter terminology you wouldn't know, flag it as confusing." : ""}${persona.techProficiency >= 4 ? "You understand technical concepts well but still evaluate the site from a usability perspective." : ""}

Your goals for this session are:
${goalsFormatted}

Things that frustrate you:
${frustrationsFormatted}

${patienceDescription}
${accessibilitySection}

As you browse, you MUST:
1. Narrate your thought process as ${persona.name} would think -- what are you looking for, what do you see, what confuses you.
2. Note anything that works well -- clear copy, intuitive navigation, helpful feedback.
3. Note anything that fails -- broken interactions, confusing layouts, missing information, slow responses.
4. Rate each page or interaction on a scale of 1-5 for clarity, usability, and whether it moves you toward your goal.
5. If you get stuck or frustrated beyond your patience threshold, stop and explain exactly where and why you gave up.

You have a budget of ${persona.maxSteps} steps. Each navigation, click, or form submission counts as a step. Plan your exploration efficiently.

When you finish (or give up), provide a structured summary:
- Tasks attempted and whether each succeeded or failed
- Top 3 usability issues found (ranked by severity)
- Top 3 things that worked well
- Overall experience score (1-10) with a one-sentence justification`.trim();
}
