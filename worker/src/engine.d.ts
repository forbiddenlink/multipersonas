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
  /** One recorded step of a persona's walk. Persisted for Persona Replay Theater — the
   * screenshot + the persona's inner-monologue reasoning turn the dry log into a replay. */
  export interface EngineStepRecord {
    step: number;
    action: string;
    detail: string;
    pageUrl: string;
    /** Absolute path to the frame captured after this step, under the run's tmp dir. */
    screenshotPath: string;
    timestamp: number;
    /** The persona's narration for this step. Navigation narration, never a verdict. */
    reasoning?: string;
  }
  export interface EnginePersonaResult {
    persona: { id: string; name: string; description: string };
    agentResult: {
      goalCompleted: boolean;
      totalSteps: number;
      pagesVisited: unknown[];
      findings: EngineFinding[];
      /** Ordered walk this persona took. Empty on a persona that failed to launch. */
      steps: EngineStepRecord[];
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
  export function isBuiltinPersonaId(id: string): boolean;
}
