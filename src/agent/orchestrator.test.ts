import { describe, it, expect, vi } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const { runPersonaAgent } = vi.hoisted(() => ({ runPersonaAgent: vi.fn() }));
vi.mock("./engine.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("./engine.js")>(),
  runPersonaAgent,
}));

import { runMultiPersonaTest } from "./orchestrator.js";
import { personaLibrary } from "../personas/library.js";

const personas = Object.values(personaLibrary).slice(0, 2);
const outputDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "pa-orch-"));

describe("runMultiPersonaTest — execution failures are not task outcomes", () => {
  it("counts runs that errored before their first step apart from blocked ones", async () => {
    runPersonaAgent.mockReset();
    runPersonaAgent
      .mockResolvedValueOnce({ findings: [], axeFindings: [], steps: [], pagesVisited: ["http://localhost:3010/"], goalCompleted: false, totalSteps: 4 })
      .mockRejectedValueOnce(new Error("Anthropic API key is missing."));
    const result = await runMultiPersonaTest({ url: "http://localhost:3010/", personas, outputDir: outputDir(), allowPrivate: true, runAxe: false });
    // Callers fail the job when errored === total; a "0/N achieved" from broken runs
    // would otherwise be saved as a verdict on the site.
    expect(result.taskSuccess).toEqual({ achieved: 0, total: 2, errored: 1 });
  });
});
