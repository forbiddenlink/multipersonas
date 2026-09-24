import { taskDefinitionSchema } from "personaudit/tasks";
import { runMultiPersonaTest } from "personaudit/orchestrator";
import { gradeScan } from "personaudit/grader";
import { personaLibrary, isBuiltinPersonaId } from "personaudit/personas/library";

process.env.MP_BLOCK_DESTRUCTIVE_ACTIONS = "1";

process.once("message", async (input: { kind: string; url: string; persona_ids: string[]; task_definition?: unknown; outputDir: string }) => {
  try {
    let result: unknown;
    if (input.kind === "grade") {
      result = await gradeScan(input.url, { maxPages: 10 });
    } else {
      const task = input.task_definition == null ? undefined : taskDefinitionSchema.parse(input.task_definition);
      const personas = input.persona_ids.filter(isBuiltinPersonaId).map((id) => personaLibrary[id]);
      if (!personas.length) throw new Error("No valid personas were configured for this audit");
      result = await runMultiPersonaTest({
        url: input.url, personas, task, outputDir: input.outputDir, parallel: true, runAxe: true,
      });
    }
    process.send?.({ result });
  } catch (error) {
    process.send?.({ error: error instanceof Error ? error.message : String(error) });
  }
  // Parent tears down the entire process tree after receiving the result.
});
