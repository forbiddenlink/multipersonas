import { z } from "zod";
import { generateSystemPrompt, type Persona } from "../personas/types.js";

const legacyTaskSchema = z.object({
  version: z.literal(1),
  goal: z.string().trim().min(10).max(1000),
  successText: z.string().trim().min(3).max(240),
}).strict();

const expectedUrlSchema = z.string().trim().max(2048).refine((value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}, "Use an absolute HTTP(S) URL without credentials.").transform((value) => new URL(value).href);

export const taskDefinitionSchema = z.discriminatedUnion("version", [
  legacyTaskSchema,
  legacyTaskSchema.extend({
    version: z.literal(2),
    expectedUrl: expectedUrlSchema.optional(),
    requireNewText: z.boolean(),
  }).refine((task) => Boolean(task.expectedUrl) || task.requireNewText, "Choose at least one additional check."),
]);

export type TaskDefinition = z.infer<typeof taskDefinitionSchema>;

export const taskEvidenceSchema = z.object({
  status: z.enum(["observed", "not-observed", "inconclusive"]),
  pageUrl: z.string(),
  stepIndex: z.number().int().min(0).nullable(),
  checks: z.object({
    text: z.enum(["observed", "not-observed", "inconclusive"]),
    url: z.enum(["matched", "mismatched", "not-required", "inconclusive"]),
    newText: z.enum(["appeared", "already-present", "not-observed", "not-required", "inconclusive"]),
  }).optional(),
});
export type TaskEvidence = z.infer<typeof taskEvidenceSchema>;

export const taskOutcomeSchema = z.object({
  personaId: z.string(),
  evidence: taskEvidenceSchema,
});
export type TaskOutcome = z.infer<typeof taskOutcomeSchema>;

export function parseTaskDefinition(value: unknown): TaskDefinition | null {
  const parsed = taskDefinitionSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function personaForTask(persona: Persona, task: TaskDefinition): Persona {
  const configured = {
    ...persona,
    goals: [task.goal, `Finish on the page displaying this exact visible text: ${JSON.stringify(task.successText)}. Do not type or manufacture the expected text to satisfy the check.`,
      ...(task.version === 2 && task.expectedUrl ? [`The final URL must match ${JSON.stringify(task.expectedUrl)}.`] : []),
      ...(task.version === 2 && task.requireNewText ? ["The expected text must be absent in the initial observation and visible at the end. If it is already present initially, do not manufacture a change; report that limitation."] : []),
    ],
  };
  return { ...configured, systemPrompt: generateSystemPrompt(configured) };
}

export function parseTaskOutcomes(task: TaskDefinition, value: unknown): TaskOutcome[] {
  const parsed = taskOutcomeSchema.array().safeParse(value);
  if (!parsed.success || (task.version === 2 && parsed.data.some(({ evidence }) => !evidence.checks && evidence.status !== "inconclusive"))) return [];
  return parsed.data;
}

export function taskEvidenceLabel(task: TaskDefinition, evidence: TaskEvidence): string {
  if (evidence.status === "inconclusive" || (task.version === 2 && !evidence.checks)) return "Could not verify";
  if (task.version === 2) return evidence.status === "observed" ? "All configured checks observed" : "Configured checks not met";
  return evidence.status === "observed" ? "Expected text observed" : "Expected text not observed";
}

export function taskCheckDetails(evidence: TaskEvidence): string {
  if (!evidence.checks) return "";
  const { text, url, newText } = evidence.checks;
  return [
    `Text: ${text === "observed" ? "visible" : text === "not-observed" ? "not visible" : "could not verify"}`,
    ...(url === "not-required" ? [] : [`URL: ${url === "matched" ? "matched" : url === "mismatched" ? "did not match" : "could not verify"}`]),
    ...(newText === "not-required" ? [] : [`Change: ${{ appeared: "absent at start, visible at end", "already-present": "text was already present at start", "not-observed": "text not visible at end", inconclusive: "could not verify" }[newText]}`]),
  ].join(" · ");
}
