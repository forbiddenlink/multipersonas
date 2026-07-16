import * as fs from "fs";
import * as path from "path";
import { chromium } from "playwright";
import type { Persona } from "../personas/types.js";
import { runPersonaAgent, type AgentResult, type Finding } from "./engine.js";
import { mergeAxeFindings } from "./axe-scan.js";
import { generateMarkdownReport, type PersonaReport } from "../report/generator.js";
import { assertUrlAllowed } from "../security/url-guard.js";

// --- Types ---

export interface TestOptions {
  url: string;
  personas: Persona[];
  outputDir: string;
  parallel?: boolean;
  onProgress?: (event: ProgressEvent) => void;
  runAxe?: boolean;
  /**
   * Permit private/loopback targets. The CLI sets this from --allow-private so
   * you can scan your own localhost/staging. The hosted service must never set it.
   */
  allowPrivate?: boolean;
  /** Path to a saved session, so personas audit the app instead of its login page. */
  sessionFile?: string;
}

export interface ProgressEvent {
  type: "axe_start" | "axe_complete" | "persona_start" | "persona_complete" | "report_start" | "report_complete";
  persona?: string;
  message: string;
}

export interface TestResult {
  url: string;
  date: string;
  /** How many personas achieved their goal. The headline number. */
  taskSuccess: TaskSuccess;
  personas: PersonaTestResult[];
  /** Every distinct axe defect, merged across all states all personas reached. */
  axeFindings: Finding[];
  conflicts: PersonaConflict[];
  reportPath: string;
}

export interface PersonaTestResult {
  persona: Persona;
  agentResult: AgentResult;
}

export interface PersonaConflict {
  pageUrl: string;
  description: string;
  personaA: { id: string; name: string; outcome: string };
  personaB: { id: string; name: string; outcome: string };
  suggestion: string;
}

/**
 * Task success: of the personas who tried, how many got what they came for.
 *
 * This replaces a 0-100 composite that subtracted 20 per critical finding from
 * a nominal 100. That number was fabricated precision and, worse, useless: any
 * real application trips enough axe rules to floor it, so a healthy Metabase
 * scored 0/100 and so would everything else. A metric that is always zero
 * cannot show you improved.
 *
 * This is an observation instead of a judgement — the same thing moderated
 * usability testing has always measured — so it moves when the site gets better
 * and it means the same thing to everyone reading it.
 */
export interface TaskSuccess {
  achieved: number;
  total: number;
}

function computeTaskSuccess(results: PersonaTestResult[]): TaskSuccess {
  return {
    achieved: results.filter((r) => r.agentResult.goalCompleted).length,
    total: results.length,
  };
}

// --- Conflict detection ---

function detectConflicts(personaResults: PersonaTestResult[]): PersonaConflict[] {
  const conflicts: PersonaConflict[] = [];

  // Build a map of page -> persona outcomes
  const pageOutcomes = new Map<string, { persona: Persona; goalCompleted: boolean; findings: Finding[] }[]>();

  for (const pr of personaResults) {
    for (const pageUrl of pr.agentResult.pagesVisited) {
      if (!pageOutcomes.has(pageUrl)) {
        pageOutcomes.set(pageUrl, []);
      }
      const pageFindings = pr.agentResult.findings.filter((f) => f.pageUrl === pageUrl);
      pageOutcomes.get(pageUrl)!.push({
        persona: pr.persona,
        goalCompleted: pr.agentResult.goalCompleted,
        findings: pageFindings,
      });
    }
  }

  // Compare outcomes on the same page
  for (const [pageUrl, outcomes] of pageOutcomes) {
    for (let i = 0; i < outcomes.length; i++) {
      for (let j = i + 1; j < outcomes.length; j++) {
        const a = outcomes[i];
        const b = outcomes[j];

        const aHasIssues = a.findings.length > 0;
        const bHasIssues = b.findings.length > 0;

        // Same page, one had issues, the other didn't — potential conflict
        if (aHasIssues !== bHasIssues) {
          const problematic = aHasIssues ? a : b;
          const successful = aHasIssues ? b : a;

          conflicts.push({
            pageUrl,
            description: `${problematic.persona.name} encountered issues on this page while ${successful.persona.name} did not`,
            personaA: {
              id: problematic.persona.id,
              name: problematic.persona.name,
              outcome: `${problematic.findings.length} issue(s) found`,
            },
            personaB: {
              id: successful.persona.id,
              name: successful.persona.name,
              outcome: "no issues",
            },
            suggestion: `Review this page for usability gaps affecting ${problematic.persona.name}'s goals`,
          });
        }
      }
    }
  }

  return conflicts;
}

// --- Main orchestrator ---

export async function runMultiPersonaTest(options: TestOptions): Promise<TestResult> {
  const {
    url,
    personas,
    outputDir,
    parallel = true,
    onProgress,
    runAxe = true,
    allowPrivate = false,
    sessionFile,
  } = options;

  // Vet the target before doing anything else, and let a refusal propagate.
  // The per-persona and axe paths below both swallow errors into a scored
  // "failed" result, so validating only in there would report a blocked URL as
  // a passing audit instead of refusing it.
  const validatedUrl = await assertUrlAllowed(url, { allowPrivate });

  fs.mkdirSync(outputDir, { recursive: true });

  // axe now runs inside each persona run, at every state that persona reaches,
  // and results are merged below. A single scan of the entry page here would
  // only re-measure what a free tool already measures.
  let axeFindings: Finding[] = [];

  // 2. Run persona agents
  const runSinglePersona = async (persona: Persona): Promise<PersonaTestResult> => {
    onProgress?.({ type: "persona_start", persona: persona.id, message: `${persona.name} is browsing...` });

    const personaOutputDir = path.join(outputDir, persona.id);
    fs.mkdirSync(personaOutputDir, { recursive: true });

    try {
      const agentResult = await runPersonaAgent(url, persona, personaOutputDir, { allowPrivate, sessionFile, runAxe });

      const status = agentResult.goalCompleted ? "goal achieved" : "blocked";
      onProgress?.({
        type: "persona_complete",
        persona: persona.id,
        message: `${persona.name}: ${agentResult.totalSteps} steps, ${agentResult.pagesVisited.length} states, ${agentResult.findings.length} UX issues, ${status}`,
      });

      return { persona, agentResult };
    } catch (error) {
      const failedResult: AgentResult = {
        findings: [],
        axeFindings: [],
        steps: [],
        pagesVisited: [url],
        goalCompleted: false,
        totalSteps: 0,
      };

      onProgress?.({
        type: "persona_complete",
        persona: persona.id,
        message: `${persona.name} failed: ${error instanceof Error ? error.message : String(error)}`,
      });

      return { persona, agentResult: failedResult };
    }
  };

  let personaResults: PersonaTestResult[];

  if (parallel) {
    const settled = await Promise.allSettled(personas.map(runSinglePersona));
    personaResults = settled.map((result, i) => {
      if (result.status === "fulfilled") return result.value;
      // Should not happen since runSinglePersona catches internally, but handle anyway
      return {
        persona: personas[i],
        agentResult: { findings: [], axeFindings: [], steps: [], pagesVisited: [url], goalCompleted: false, totalSteps: 0 },
      };
    });
  } else {
    personaResults = [];
    for (const persona of personas) {
      const result = await runSinglePersona(persona);
      personaResults.push(result);
    }
  }

  // 3. Detect conflicts
  const conflicts = detectConflicts(personaResults);

  // Merge every persona's axe results into one list of distinct defects. Without
  // this the same nav-bar violation is reported once per persona per page, and
  // the issue count measures how many personas you hired (the report claimed 30
  // issues where there were 14 — 2026-07-16).
  axeFindings = runAxe
    ? mergeAxeFindings(personaResults.flatMap((r) => r.agentResult.axeFindings))
    : [];

  const taskSuccess = computeTaskSuccess(personaResults);

  // 5. Generate report
  onProgress?.({ type: "report_start", message: "Generating report..." });

  const personaReports: PersonaReport[] = personaResults.map((pr) => ({
    persona: pr.persona,
    agentResult: pr.agentResult,
  }));

  // Persist the raw results BEFORE rendering anything. Every persona run above
  // costs real model calls; a formatting bug in the renderer must never be able
  // to throw that away. (On 2026-07-15 it did: a missing field crashed report
  // generation and destroyed a completed 9-persona run.)
  const resultsPath = path.join(outputDir, "results.json");
  fs.writeFileSync(
    resultsPath,
    JSON.stringify({ url, taskSuccess, personas: personaResults, axeFindings, conflicts }, null, 2),
  );

  const reportPath = path.join(outputDir, "report.md");
  let renderedPath = resultsPath;
  try {
    fs.writeFileSync(reportPath, generateMarkdownReport(url, personaReports, axeFindings));
    renderedPath = reportPath;
    onProgress?.({ type: "report_complete", message: `Report saved to ${reportPath}` });
  } catch (error) {
    // The run succeeded; only the rendering failed. Say so, keep the data, and
    // return normally rather than throwing away everything that was paid for.
    onProgress?.({
      type: "report_complete",
      message: `Report rendering failed (${error instanceof Error ? error.message : String(error)}). Raw results kept at ${resultsPath}`,
    });
  }

  return {
    url,
    date: new Date().toISOString().split("T")[0],
    taskSuccess,
    personas: personaResults,
    axeFindings,
    conflicts,
    // Points at the raw JSON if rendering failed — never at a file that is not there.
    reportPath: renderedPath,
  };
}
