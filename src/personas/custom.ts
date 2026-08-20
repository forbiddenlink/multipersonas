import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { Persona } from "./types.js";
import { personaLibrary } from "./library.js";

/**
 * Where a project's personas live.
 *
 * Personas belong in the repository, next to the code they describe. Your
 * marketing site and your admin console do not share users, so a single global
 * set is wrong by construction — and personas kept in a home directory cannot
 * be reviewed in a pull request, cannot be read by CI, are invisible to
 * teammates, and disappear with the laptop.
 *
 * In the repo they are diffable, reviewable, and versioned alongside the app
 * they model. Generation writes a first draft; editing it is the point.
 */
export const PROJECT_DIR = "mpersonas";

/**
 * Kept for personas created before the project directory existed. Read, never
 * written. Project personas win on an id clash, because a persona sitting in the
 * repo is the one the team agreed on.
 */
const LEGACY_GLOBAL_DIR = path.join(os.homedir(), ".mpersonas", "personas");

export function projectDir(cwd: string = process.cwd()): string {
  return path.join(cwd, PROJECT_DIR);
}

function readPersonaDir(dir: string): Record<string, Persona> {
  const result: Record<string, Persona> = {};
  if (!fs.existsSync(dir)) return result;

  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    try {
      const persona: Persona = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
      if (persona?.id) result[persona.id] = persona;
    } catch {
      // A malformed file must not take down every other persona.
    }
  }
  return result;
}

export function loadCustomPersonas(cwd: string = process.cwd()): Record<string, Persona> {
  return { ...readPersonaDir(LEGACY_GLOBAL_DIR), ...readPersonaDir(projectDir(cwd)) };
}

/** True if this project keeps its own personas. */
export function hasProjectPersonas(cwd: string = process.cwd()): boolean {
  return Object.keys(readPersonaDir(projectDir(cwd))).length > 0;
}

export function saveCustomPersona(persona: Persona, cwd: string = process.cwd()): string {
  const dir = projectDir(cwd);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${persona.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(persona, null, 2) + "\n", "utf-8");
  return filePath;
}

export function deleteCustomPersona(id: string, cwd: string = process.cwd()): boolean {
  for (const dir of [projectDir(cwd), LEGACY_GLOBAL_DIR]) {
    const filePath = path.join(dir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  }
  return false;
}

/**
 * Every persona available here.
 *
 * The built-in library is a starting point, not an answer: it describes generic
 * web users, and generic users find generic problems. A project's own personas
 * override it by id.
 */
export function getAllPersonas(cwd: string = process.cwd()): Record<string, Persona> {
  return { ...personaLibrary, ...loadCustomPersonas(cwd) };
}

export function isCustomPersona(id: string, cwd: string = process.cwd()): boolean {
  return Object.hasOwn(loadCustomPersonas(cwd), id);
}

export function personaSource(id: string, cwd: string = process.cwd()): "project" | "global" | "builtin" | "unknown" {
  if (Object.hasOwn(readPersonaDir(projectDir(cwd)), id)) return "project";
  if (Object.hasOwn(readPersonaDir(LEGACY_GLOBAL_DIR), id)) return "global";
  if (Object.hasOwn(personaLibrary, id)) return "builtin";
  return "unknown";
}
