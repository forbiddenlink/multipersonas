import * as fs from "fs";
import * as path from "path";
import { chromium } from "playwright";
import type { Persona } from "../personas/types.js";
import { runPersonaAgent, type AgentResult, type Finding } from "./engine.js";
import { runAxeScan } from "./axe-scan.js";
import { generateMarkdownReport, type PersonaReport } from "../report/generator.js";

// --- Types ---

export interface TestOptions {
  url: string;
  personas: Persona[];
  outputDir: string;
  parallel?: boolean;
  onProgress?: (event: ProgressEvent) => void;
  runAxe?: boolean;
}

export interface ProgressEvent {
  type: "axe_start" | "axe_complete" | "persona_start" | "persona_complete" | "report_start" | "report_complete";
  persona?: string;
  message: string;
}

export interface TestResult {
  url: string;
  date: string;
  overallScore: number;
  personas: PersonaTestResult[];
  axeFindings: Finding[];
  conflicts: PersonaConflict[];
  reportPath: string;
}

export interface PersonaTestResult {
  persona: Persona;
  agentResult: AgentResult;
  score: number;
}

export interface PersonaConflict {
  pageUrl: string;
  description: string;
  personaA: { id: string; name: string; outcome: string };
  personaB: { id: string; name: string; outcome: string };
  suggestion: string;
}

// --- Score computation ---

function computePersonaScore(findings: Finding[], goalCompleted: boolean): number {
  let score = 100;
  for (const f of findings) {
    switch (f.severity) {
      case "critical":
        score -= 20;
        break;
      case "serious":
        score -= 10;
        break;
      case "moderate":
        score -= 5;
        break;
      case "minor":
        score -= 2;
        break;
    }
  }
  if (!goalCompleted) score -= 15;
  return Math.max(0, Math.min(100, score));
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
            suggestion: `Review this page for accessibility/usability gaps affecting ${problematic.persona.name}'s needs (${problematic.persona.accessibilityNeeds.join(", ") || "general usability"})`,
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
  } = options;

  fs.mkdirSync(outputDir, { recursive: true });

  // 1. Run axe-core scan (shared across all personas)
  let axeFindings: Finding[] = [];
  if (runAxe) {
    onProgress?.({ type: "axe_start", message: "Running axe-core accessibility scan..." });
    try {
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      axeFindings = await runAxeScan(page);
      await browser.close();
      onProgress?.({ type: "axe_complete", message: `axe-core: ${axeFindings.length} accessibility issues found` });
    } catch (error) {
      onProgress?.({ type: "axe_complete", message: `axe-core scan failed: ${error instanceof Error ? error.message : String(error)}` });
    }
  }

  // 2. Run persona agents
  const runSinglePersona = async (persona: Persona): Promise<PersonaTestResult> => {
    onProgress?.({ type: "persona_start", persona: persona.id, message: `${persona.name} is browsing...` });

    const personaOutputDir = path.join(outputDir, persona.id);
    fs.mkdirSync(personaOutputDir, { recursive: true });

    try {
      const agentResult = await runPersonaAgent(url, persona, personaOutputDir);
      const allFindings = [...agentResult.findings, ...axeFindings];
      const score = computePersonaScore(allFindings, agentResult.goalCompleted);

      const status = agentResult.goalCompleted ? "goal completed" : "abandoned";
      onProgress?.({
        type: "persona_complete",
        persona: persona.id,
        message: `${persona.name}: ${agentResult.totalSteps} steps, ${allFindings.length} issues, ${status}`,
      });

      return { persona, agentResult, score };
    } catch (error) {
      const failedResult: AgentResult = {
        findings: [],
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

      return {
        persona,
        agentResult: failedResult,
        score: computePersonaScore(axeFindings, false),
      };
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
        agentResult: { findings: [], steps: [], pagesVisited: [url], goalCompleted: false, totalSteps: 0 },
        score: 0,
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

  // 4. Compute overall score
  const overallScore = personaResults.length > 0
    ? Math.round(personaResults.reduce((sum, r) => sum + r.score, 0) / personaResults.length)
    : 0;

  // 5. Generate report
  onProgress?.({ type: "report_start", message: "Generating report..." });

  const personaReports: PersonaReport[] = personaResults.map((pr) => ({
    persona: pr.persona,
    agentResult: pr.agentResult,
    axeFindings,
  }));

  const reportMarkdown = generateMarkdownReport(url, personaReports);
  const reportPath = path.join(outputDir, "report.md");
  fs.writeFileSync(reportPath, reportMarkdown);

  onProgress?.({ type: "report_complete", message: `Report saved to ${reportPath}` });

  return {
    url,
    date: new Date().toISOString().split("T")[0],
    overallScore,
    personas: personaResults,
    axeFindings,
    conflicts,
    reportPath,
  };
}
