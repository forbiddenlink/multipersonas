import { runMultiPersonaTest } from "multipersonas/orchestrator";
import { gradeScan } from "multipersonas/grader";
import { personaLibrary, isBuiltinPersonaId } from "multipersonas/personas/library";

process.env.MP_BLOCK_DESTRUCTIVE_ACTIONS = "1";

process.once("message", async (input: { kind: string; url: string; persona_ids: string[]; outputDir: string }) => {
  try {
    let result: unknown;
    if (input.kind === "grade") {
      result = await gradeScan(input.url, { maxPages: 10 });
    } else {
      const personas = input.persona_ids.filter(isBuiltinPersonaId).map((id) => personaLibrary[id]);
      if (!personas.length) throw new Error("No valid personas were configured for this audit");
      result = await runMultiPersonaTest({
        url: input.url, personas, outputDir: input.outputDir, parallel: true, runAxe: true,
      });
    }
    process.send?.({ result });
  } catch (error) {
    process.send?.({ error: error instanceof Error ? error.message : String(error) });
  }
  // Parent tears down the entire process tree after receiving the result.
});
