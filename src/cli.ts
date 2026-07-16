#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import { personaLibrary, personasByCategory } from "./personas/library.js";
import { RETIRED_PERSONA_IDS } from "./personas/prebuilt.js";
import { generatePersonasFromUrl, generatePersonasFromDescription } from "./personas/generator.js";
import { runMultiPersonaTest, type ProgressEvent } from "./agent/orchestrator.js";
import { crawl } from "./crawler/crawl.js";
import { groupAxeByRule, generateScanReport } from "./report/generator.js";
import type { Persona } from "./personas/types.js";
import { getAllPersonas, saveCustomPersona, deleteCustomPersona, isCustomPersona, personaSource, hasProjectPersonas, PROJECT_DIR } from "./personas/custom.js";
import { generateSystemPrompt } from "./personas/types.js";
import { assertUrlAllowed, BlockedUrlError } from "./security/url-guard.js";
import { captureSession, resolveSessionFile, sessionIsLive, SessionError } from "./auth/session.js";
import * as readline from "node:readline/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"), "utf-8"));

const importedPersonaSchema = z.object({
  id: z.string(),
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
  viewport: z.object({
    width: z.number(),
    height: z.number(),
  }),
  isMobile: z.boolean(),
  connectionSpeed: z.enum(["fast", "3g", "slow-3g"]),
  kind: z.enum(["ux", "traversal"]).default("ux"),
  inputModality: z.enum(["pointer", "keyboard"]).default("pointer"),
  maxSteps: z.number(),
  patienceLevel: z.enum(["low", "medium", "high"]),
  systemPrompt: z.string().optional(),
});

const program = new Command();

program
  .name("mpersonas")
  .description("AI persona-based website testing")
  .version(pkg.version);

// --- Scan command ---

program
  .command("scan")
  .description("Crawl a site and check every page for accessibility defects (no AI personas — deterministic and free)")
  .argument("<url>", "URL to scan")
  .option("-o, --output <path>", "Output directory", "./mpersonas-report")
  .option("--session <file>", "Saved session from `mpersonas auth`, to scan behind a login")
  .option("--max-pages <n>", "How many states to crawl", "40")
  .option("--allow-private", "Allow localhost / private-network targets. For your own app or staging box.")
  .action(async (url: string, options: { output: string; session?: string; maxPages: string; allowPrivate?: boolean }) => {
    // Vet the target up front; crawl() checks again but this fails fast with a
    // readable message before launching a browser.
    try {
      await assertUrlAllowed(url, { allowPrivate: options.allowPrivate });
    } catch (error) {
      if (error instanceof BlockedUrlError) {
        console.error("");
        console.error(chalk.red(`  ${error.message}`));
        if (/private network/.test(error.message)) {
          console.error(chalk.dim("  If this is your own app or staging box, re-run with --allow-private"));
        }
        console.error("");
        process.exit(1);
      }
      throw error;
    }

    if (options.session) {
      try {
        resolveSessionFile(options.session);
      } catch (error) {
        if (error instanceof SessionError) {
          console.error("");
          console.error(chalk.red(`  ${error.message}`));
          console.error("");
          process.exit(1);
        }
        throw error;
      }
    }

    console.log("");
    console.log(chalk.bold(`  MultiPersonas v${pkg.version}`));
    console.log(chalk.dim(`  Scanning: ${url}`));
    if (options.session) console.log(chalk.dim(`  Signed in via: ${options.session}`));
    console.log("");

    const spinner = ora("Crawling...").start();
    const result = await crawl(url, {
      sessionFile: options.session,
      maxPages: parseInt(options.maxPages, 10),
      allowPrivate: options.allowPrivate,
      onPage: (pageUrl, i) => {
        spinner.text = `Crawling... ${i + 1} states, at ${pageUrl}`;
      },
    });
    spinner.succeed(`Scanned ${result.pagesVisited.length} states`);

    const groups = groupAxeByRule(result.findings);
    const groupSev = (sev: string) => groups.filter((g) => g.severity === sev).length;

    fs.mkdirSync(options.output, { recursive: true });
    const reportPath = path.join(options.output, "scan.md");
    fs.writeFileSync(reportPath, generateScanReport(url, result.findings, result.pagesVisited, result.skipped));

    console.log("");
    console.log(`  Accessibility: ${groups.length} defects` +
      chalk.dim(` (${groupSev("critical")} critical, ${groupSev("serious")} serious) across ${result.findings.length} elements`));
    if (result.skipped.length > 0) {
      console.log(chalk.yellow(`  Budget reached: ${result.skipped.length} more states not scanned (raise --max-pages)`));
    }
    console.log(chalk.dim(`  Report: ${reportPath}`));
    console.log("");
  });

// --- Run command ---

program
  .command("auth")
  .description("Log in to a site once and save the session, so personas can test past the login wall")
  .argument("<url>", "URL of the site's login page")
  .option("-s, --save <file>", "Where to save the session", "./.mpersonas-session.json")
  .option(
    "--allow-private",
    "Allow localhost / private-network targets. For your own app or staging box."
  )
  .action(async (url: string, options: { save: string; allowPrivate?: boolean }) => {
    console.log("");
    console.log(chalk.bold(`  MultiPersonas v${pkg.version}`));
    console.log(chalk.dim(`  Opening ${url} in a browser.`));
    console.log("");
    console.log("  Sign in yourself, however you normally do — password, SSO, 2FA, a magic link.");
    console.log(chalk.dim("  Your password is never sent to the AI. Only the resulting session is saved."));

    try {
      await captureSession(url, options.save, { allowPrivate: options.allowPrivate });
    } catch (error) {
      console.error("");
      if (error instanceof BlockedUrlError || error instanceof SessionError) {
        console.error(chalk.red(`  ${error.message}`));
        if (error instanceof BlockedUrlError && /private network/.test(error.message)) {
          console.error(chalk.dim("  If this is your own app or staging box, re-run with --allow-private"));
        }
        console.error("");
        process.exit(1);
      }
      throw error;
    }

    console.log("");
    console.log(chalk.green(`  Session saved to ${options.save}`));
    console.log(chalk.yellow("  Treat that file like a password — anyone who has it is signed in as you."));
    console.log(chalk.dim(`  Use it:  mpersonas run ${url} --session ${options.save}`));
    console.log("");
  });

program
  .command("run")
  .description("Run persona tests against a URL")
  .argument("<url>", "URL to test")
  .option(
    "-p, --personas <names>",
    "Comma-separated persona IDs (default: all)",
    "all"
  )
  .option("-o, --output <path>", "Output directory", "./mpersonas-report")
  .option("--no-axe", "Skip axe-core accessibility scan")
  .option("--parallel", "Run personas concurrently (default)", true)
  .option("--sequential", "Run personas one at a time")
  .option("--count <n>", "Auto-generate N personas from the URL")
  .option("--describe <text>", "Generate personas from a text description")
  .option(
    "--allow-private",
    "Allow localhost / private-network targets. For scanning your own app or staging box — only pass this for a site you own."
  )
  .option(
    "--session <file>",
    "Saved session from `mpersonas auth`, so personas test the app itself instead of its login page."
  )
  .action(async (url: string, options: {
    personas: string;
    output: string;
    axe: boolean;
    parallel: boolean;
    sequential: boolean;
    count?: string;
    describe?: string;
    allowPrivate?: boolean;
    session?: string;
  }) => {
    // Vet the target first. runMultiPersonaTest checks again, but persona
    // generation runs before it and costs model calls — no reason to spend them
    // on a URL we are going to refuse.
    try {
      await assertUrlAllowed(url, { allowPrivate: options.allowPrivate });
    } catch (error) {
      if (error instanceof BlockedUrlError) {
        console.error("");
        console.error(chalk.red(`  ${error.message}`));
        if (/private network/.test(error.message)) {
          console.error(chalk.dim(`  If this is your own app or staging box, re-run with --allow-private`));
        }
        console.error("");
        process.exit(1);
      }
      throw error;
    }

    // Validate the session before persona generation spends model calls, and
    // warn on a stale one: a run with an expired session silently audits the
    // login page and reports its problems as the application's.
    if (options.session) {
      try {
        resolveSessionFile(options.session);
      } catch (error) {
        if (error instanceof SessionError) {
          console.error("");
          console.error(chalk.red(`  ${error.message}`));
          console.error("");
          process.exit(1);
        }
        throw error;
      }

      const live = await sessionIsLive(url, options.session, { allowPrivate: options.allowPrivate });
      if (!live) {
        console.error("");
        console.error(chalk.red("  That session no longer signs you in — it has probably expired."));
        console.error(chalk.dim(`  Refresh it with:  mpersonas auth ${url} --save ${options.session}`));
        console.error(chalk.dim("  Continuing would audit the login page and report its issues as your app's."));
        console.error("");
        process.exit(1);
      }
    }

    console.log("");
    console.log(chalk.bold(`  MultiPersonas v${pkg.version}`));
    console.log(chalk.dim(`  Testing: ${url}`));
    if (options.session) console.log(chalk.dim(`  Signed in via: ${options.session}`));
    console.log("");

    // Resolve personas
    let personas: Persona[];

    if (options.count) {
      const count = parseInt(options.count, 10);
      const genSpinner = ora(`Generating ${count} personas from URL...`).start();
      try {
        personas = await generatePersonasFromUrl(url, count, {
          allowPrivate: options.allowPrivate,
          sessionFile: options.session,
        });
        genSpinner.succeed(`Generated ${personas.length} personas`);
      } catch (error) {
        genSpinner.fail(`Failed to generate personas: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    } else if (options.describe) {
      const count = 4;
      const genSpinner = ora(`Generating personas from description...`).start();
      try {
        personas = await generatePersonasFromDescription(options.describe, count);
        genSpinner.succeed(`Generated ${personas.length} personas`);
      } catch (error) {
        genSpinner.fail(`Failed to generate personas: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    } else {
      const allPersonas = getAllPersonas();

      // "all" means this project's personas when it has any. The built-in
      // library describes generic web users, and generic users find generic
      // problems; a project that has written down its own users has said who
      // matters, so mixing the library back in only dilutes the run. Name them
      // explicitly with --personas to get a built-in anyway.
      const useProject = options.personas === "all" && hasProjectPersonas();
      const personaIds =
        options.personas === "all"
          ? Object.keys(allPersonas).filter((id) => !useProject || personaSource(id) === "project")
          : options.personas.split(",").map((s) => s.trim());

      if (useProject) {
        console.log(chalk.dim(`  Using ${personaIds.length} personas from ./${PROJECT_DIR}/`));
      }

      personas = personaIds.map((id) => {
        const persona = allPersonas[id];
        if (!persona) {
          const replacement = RETIRED_PERSONA_IDS[id];
          if (replacement !== undefined) {
            console.error(chalk.red(`Persona "${id}" has been retired.`));
            console.error(
              chalk.dim(
                replacement
                  ? `  Use "${replacement}" instead. We no longer simulate disabled users —\n  accessibility is measured by axe-core at every state reached.\n  See docs/PLAN-2026-07-15-repositioning.md`
                  : `  It was removed: colour contrast is checked deterministically by axe-core,\n  which is more reliable than a model roleplaying a disability.\n  See docs/PLAN-2026-07-15-repositioning.md`
              )
            );
            process.exit(1);
          }
          console.error(chalk.red(`Unknown persona: ${id}`));
          console.error(
            chalk.dim(
              `Available: ${Object.keys(allPersonas).join(", ")}`
            )
          );
          process.exit(1);
        }
        return persona;
      });
    }

    console.log(
      chalk.dim(
        `  Personas: ${personas.map((p) => `${p.name} (${p.id})`).join(", ")}`
      )
    );
    console.log("");

    const outputDir = path.resolve(options.output);
    const isParallel = !options.sequential;

    // Track spinners per persona
    const spinners = new Map<string, ReturnType<typeof ora>>();

    const result = await runMultiPersonaTest({
      url,
      personas,
      outputDir,
      parallel: isParallel,
      runAxe: options.axe,
      allowPrivate: options.allowPrivate,
      sessionFile: options.session,
      onProgress: (event: ProgressEvent) => {
        switch (event.type) {
          case "axe_start": {
            const s = ora(event.message).start();
            spinners.set("axe", s);
            break;
          }
          case "axe_complete": {
            const s = spinners.get("axe");
            if (s) {
              if (event.message.includes("failed")) s.fail(event.message);
              else s.succeed(event.message);
            }
            break;
          }
          case "persona_start": {
            const s = ora(event.message).start();
            if (event.persona) spinners.set(event.persona, s);
            break;
          }
          case "persona_complete": {
            const s = event.persona ? spinners.get(event.persona) : undefined;
            if (s) {
              if (event.message.includes("failed")) s.fail(event.message);
              else s.succeed(event.message);
            }
            break;
          }
          case "report_start": {
            const s = ora(event.message).start();
            spinners.set("report", s);
            break;
          }
          case "report_complete": {
            const s = spinners.get("report");
            if (s) s.succeed(event.message);
            break;
          }
        }
      },
    });

    console.log("");

    // Print conflicts if any
    if (result.conflicts.length > 0) {
      console.log(chalk.yellow(`  ${result.conflicts.length} persona conflict(s) detected:`));
      for (const c of result.conflicts.slice(0, 5)) {
        console.log(chalk.dim(`    - ${c.description}`));
      }
      console.log("");
    }

    // Lead with task success: it is the number that means something and the
    // one that moves when the site improves.
    const { achieved, total } = result.taskSuccess;
    const uxFindings = result.personas.flatMap((p) => p.agentResult.findings);
    const states = new Set(result.personas.flatMap((p) => p.agentResult.pagesVisited));
    const sev = (list: typeof uxFindings, s: string) => list.filter((f) => f.severity === s).length;

    console.log("");
    const successColour = achieved === total ? chalk.green : achieved === 0 ? chalk.red : chalk.yellow;
    console.log(successColour(`  Task success: ${achieved}/${total} personas achieved their goal`));
    console.log(chalk.dim(`  States reached: ${states.size}`));
    // Count distinct rules, matching the report. Counting elements says "94
    // defects" where the report says 15, and two numbers for one thing is how a
    // buyer decides neither is true.
    const axeGroups = groupAxeByRule(result.axeFindings);
    const groupSev = (s: string) => axeGroups.filter((g) => g.severity === s).length;
    console.log(
      `  Accessibility: ${axeGroups.length} defects` +
        chalk.dim(` (${groupSev("critical")} critical, ${groupSev("serious")} serious) across ${result.axeFindings.length} elements — axe-core`),
    );
    console.log(
      `  UX observations: ${uxFindings.length}` +
        chalk.dim(` (${sev(uxFindings, "critical")} critical, ${sev(uxFindings, "serious")} serious) — AI judgement`),
    );
    console.log(chalk.dim(`  Report: ${result.reportPath}`));
    console.log("");
  });

// --- Generate command ---

program
  .command("generate")
  .description("Generate personas for a URL without running tests")
  .argument("<url>", "URL to generate personas for")
  .option("--count <n>", "Number of personas to generate", "4")
  .option("--describe <text>", "Generate personas from a text description instead of URL analysis")
  .option("--allow-private", "Allow localhost / private-network targets. For your own app or staging box.")
  .option("--session <file>", "Saved session from `mpersonas auth`, so personas are derived from the signed-in app.")
  .option("--save", "Write the personas into ./mpersonas/ so you can edit and commit them")
  .action(async (url: string, options: { count: string; describe?: string; allowPrivate?: boolean; session?: string; save?: boolean }) => {
    const count = parseInt(options.count, 10);
    const spinner = ora(`Generating ${count} personas...`).start();

    try {
      const personas = options.describe
        ? await generatePersonasFromDescription(options.describe, count)
        : await generatePersonasFromUrl(url, count, {
            allowPrivate: options.allowPrivate,
            sessionFile: options.session,
          });

      spinner.succeed(`Generated ${personas.length} personas`);
      console.log("");

      const saved: string[] = [];
      for (const persona of personas) {
        if (options.save) saved.push(saveCustomPersona(persona));
        console.log(`  ${chalk.cyan(persona.id)}`);
        console.log(`    ${persona.name} — ${persona.description}`);
        console.log(
          chalk.dim(
            `    Tech: ${persona.techProficiency}/5 | Steps: ${persona.maxSteps} | ${persona.isMobile ? "Mobile" : "Desktop"} | ${persona.connectionSpeed}`
          )
        );
        if (persona.inputModality === "keyboard") {
          console.log(chalk.dim(`    Input: keyboard only`));
        }
        console.log(chalk.dim(`    Goals: ${persona.goals.join("; ")}`));
        console.log("");
      }

      // Generated personas are a first draft. You know your users; the model
      // only saw your markup. Editing them is the point, so say so.
      if (options.save) {
        console.log(chalk.green(`  Saved ${saved.length} personas to ./${PROJECT_DIR}/`));
        console.log(chalk.dim("  Edit their goals to match what you actually care about, then commit them."));
        console.log(chalk.dim(`  They are picked up automatically by:  mpersonas run ${url}`));
      } else {
        console.log(chalk.dim(`  Re-run with --save to write these into ./${PROJECT_DIR}/ so you can edit and commit them.`));
      }
      console.log("");
    } catch (error) {
      spinner.fail(`Failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// --- List command ---

program
  .command("list")
  .description("List available personas")
  .option("-c, --category <category>", "Filter by category")
  .action((options: { category?: string }) => {
    const allPersonas = getAllPersonas();

    let filteredIds: string[];
    if (options.category) {
      const categoryIds = personasByCategory[options.category];
      if (!categoryIds) {
        console.error(chalk.red(`Unknown category: ${options.category}`));
        console.error(
          chalk.dim(`Available categories: ${Object.keys(personasByCategory).join(", ")}`)
        );
        process.exit(1);
      }
      filteredIds = categoryIds.filter((id) => id in allPersonas);
    } else {
      filteredIds = Object.keys(allPersonas);
    }

    console.log("");
    console.log(chalk.bold("  Available Personas"));
    if (options.category) {
      console.log(chalk.dim(`  Category: ${options.category}`));
    }
    console.log("");

    for (const id of filteredIds) {
      const persona = allPersonas[id];
      const customTag = isCustomPersona(id) ? chalk.yellow(" [custom]") : "";
      console.log(`  ${chalk.cyan(id)}${customTag}`);
      console.log(`    ${persona.name} — ${persona.description}`);
      console.log(
        chalk.dim(
          `    Tech: ${persona.techProficiency}/5 | Steps: ${persona.maxSteps} | ${persona.isMobile ? "Mobile" : "Desktop"} | ${persona.connectionSpeed}`
        )
      );
      if (persona.inputModality === "keyboard") {
        console.log(chalk.dim(`    Input: keyboard only`));
      }
      console.log("");
    }
  });

// --- Create command ---

function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseConnectionSpeed(input: string): "fast" | "3g" | "slow-3g" {
  const normalized = input.trim().toLowerCase();
  if (normalized === "3g") return "3g";
  if (normalized === "slow-3g") return "slow-3g";
  return "fast";
}

function parsePatienceLevel(input: string): "low" | "medium" | "high" {
  const normalized = input.trim().toLowerCase();
  if (normalized === "low") return "low";
  if (normalized === "high") return "high";
  return "medium";
}

function parseTechProficiency(input: string): 1 | 2 | 3 | 4 | 5 {
  const n = parseInt(input, 10);
  if (n >= 1 && n <= 5) return n as 1 | 2 | 3 | 4 | 5;
  return 3;
}

function parseViewport(device: string): { viewport: { width: number; height: number }; isMobile: boolean } {
  if (device.trim().toLowerCase() === "mobile") {
    return { viewport: { width: 390, height: 844 }, isMobile: true };
  }
  return { viewport: { width: 1440, height: 900 }, isMobile: false };
}

program
  .command("create")
  .description("Create a custom persona")
  .option("--from-json <path>", "Import persona from a JSON file")
  .action(async (options: { fromJson?: string }) => {
    if (options.fromJson) {
      try {
        const content = fs.readFileSync(path.resolve(options.fromJson), "utf-8");
        const data = JSON.parse(content);

        const parsed = importedPersonaSchema.safeParse(data);
        if (!parsed.success) {
          console.error(chalk.red(`Invalid persona format: ${parsed.error.message}`));
          process.exit(1);
        }

        const persona: Persona = {
          ...parsed.data,
          systemPrompt: parsed.data.systemPrompt || generateSystemPrompt(parsed.data),
        };
        saveCustomPersona(persona);
        console.log(chalk.green(`Saved custom persona: ${persona.id} (${persona.name})`));
      } catch (error) {
        console.error(chalk.red(`Failed to import: ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
      }
      return;
    }

    // Interactive prompts
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      const name = (await rl.question("Name (required): ")).trim();
      if (!name) {
        console.error(chalk.red("Name is required"));
        process.exit(1);
      }

      const suggestedId = toKebabCase(name);
      const idInput = (await rl.question(`ID [${suggestedId}]: `)).trim();
      const id = idInput || suggestedId;

      const description = (await rl.question("Description (required): ")).trim();
      if (!description) {
        console.error(chalk.red("Description is required"));
        process.exit(1);
      }

      const goalsInput = (await rl.question("Goals (comma-separated): ")).trim();
      const goals = goalsInput ? goalsInput.split(",").map((s) => s.trim()).filter(Boolean) : [];

      const frustInput = (await rl.question("Frustrations (comma-separated): ")).trim();
      const frustrations = frustInput ? frustInput.split(",").map((s) => s.trim()).filter(Boolean) : [];

      const techInput = (await rl.question("Tech proficiency (1-5) [3]: ")).trim();
      const techProficiency = parseTechProficiency(techInput || "3");

      const deviceInput = (await rl.question("Device (desktop/mobile) [desktop]: ")).trim();
      const { viewport, isMobile } = parseViewport(deviceInput || "desktop");

      const connInput = (await rl.question("Connection speed (fast/3g/slow-3g) [fast]: ")).trim();
      const connectionSpeed = parseConnectionSpeed(connInput || "fast");

      // Deliberately no "accessibility needs" prompt. Custom personas are UX
      // opinion profiles; accessibility comes from axe at every state and the
      // keyboard-traversal profile, never from a persona claiming a disability.
      const keyboardInput = (await rl.question("Keyboard-only navigation? (y/N): ")).trim().toLowerCase();
      const inputModality = keyboardInput === "y" || keyboardInput === "yes" ? "keyboard" : "pointer";

      const stepsInput = (await rl.question("Max steps [20]: ")).trim();
      const maxSteps = parseInt(stepsInput || "20", 10) || 20;

      const patienceInput = (await rl.question("Patience level (low/medium/high) [medium]: ")).trim();
      const patienceLevel = parsePatienceLevel(patienceInput || "medium");

      const partial: Omit<Persona, "systemPrompt"> = {
        id,
        name,
        description,
        goals,
        frustrations,
        techProficiency,
        kind: "ux",
        viewport,
        isMobile,
        connectionSpeed,
        inputModality,
        maxSteps,
        patienceLevel,
      };

      const persona: Persona = {
        ...partial,
        systemPrompt: generateSystemPrompt(partial),
      };

      const savedTo = saveCustomPersona(persona);
      console.log("");
      console.log(chalk.green(`Saved persona: ${id} (${name})`));
      console.log(chalk.dim(`  File: ${savedTo}`));
      console.log(chalk.dim("  Commit it — personas belong with the code they describe."));
    } finally {
      rl.close();
    }
  });

// --- Delete command ---

program
  .command("delete")
  .description("Delete a custom persona")
  .argument("<id>", "Persona ID to delete")
  .action((id: string) => {
    if (id in personaLibrary && !isCustomPersona(id)) {
      console.error(chalk.red(`Cannot delete built-in persona: ${id}`));
      process.exit(1);
    }

    if (!isCustomPersona(id)) {
      console.error(chalk.red(`Custom persona not found: ${id}`));
      process.exit(1);
    }

    deleteCustomPersona(id);
    console.log(chalk.green(`Deleted custom persona: ${id}`));
  });

program.parse();
