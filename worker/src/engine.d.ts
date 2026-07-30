// Ambient types for the engine's published entry points. The root package exports
// runtime JS without .d.ts; the worker only needs these narrow shapes, so declare them
// here rather than widen the root package's build surface.
declare module "multipersonas/orchestrator" {
  export interface TestOptions {
    url: string;
    personas: unknown[];
    outputDir: string;
    parallel?: boolean;
    runAxe?: boolean;
  }
  export interface EngineFinding {
    severity: string;
    category: string;
    title: string;
    description: string;
    recommendation: string;
    pageUrl: string;
    seenOn?: string[];
  }
  export interface EnginePersonaResult {
    persona: { id: string; name: string; description: string };
    agentResult: {
      goalCompleted: boolean;
      totalSteps: number;
      pagesVisited: unknown[];
      findings: EngineFinding[];
    };
  }
  export interface TestResult {
    url: string;
    taskSuccess: { achieved: number; total: number };
    personas: EnginePersonaResult[];
    axeFindings: {
      severity: string;
      title: string;
      description: string;
      recommendation: string;
      pageUrl: string;
      seenOn?: string[];
      /** axe rule id, e.g. "color-contrast" — carried for the Report export. */
      ruleId?: string;
      /** axe tags incl. WCAG success criteria (e.g. "wcag143"). */
      wcagTags?: string[];
      /** CSS selector of the offending element — CLI/web baseline identity. */
      target?: string;
    }[];
    conflicts: { description: string; suggestion: string }[];
  }
  export function runMultiPersonaTest(options: TestOptions): Promise<TestResult>;
}

declare module "multipersonas/personas/library" {
  export const personaLibrary: Record<string, unknown>;
}
