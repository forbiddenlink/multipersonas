import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { Persona } from "./types.js";
import { personaLibrary } from "./library.js";

const STORAGE_DIR = path.join(os.homedir(), ".mpersonas", "personas");

function ensureStorageDir(): void {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export function loadCustomPersonas(): Record<string, Persona> {
  ensureStorageDir();
  const result: Record<string, Persona> = {};

  const files = fs.readdirSync(STORAGE_DIR).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(STORAGE_DIR, file), "utf-8");
      const persona: Persona = JSON.parse(content);
      result[persona.id] = persona;
    } catch {
      // Skip malformed files
    }
  }

  return result;
}

export function saveCustomPersona(persona: Persona): void {
  ensureStorageDir();
  const filePath = path.join(STORAGE_DIR, `${persona.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(persona, null, 2), "utf-8");
}

export function deleteCustomPersona(id: string): boolean {
  const filePath = path.join(STORAGE_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    return false;
  }
  fs.unlinkSync(filePath);
  return true;
}

export function getAllPersonas(): Record<string, Persona> {
  const custom = loadCustomPersonas();
  return { ...personaLibrary, ...custom };
}

export function isCustomPersona(id: string): boolean {
  const filePath = path.join(STORAGE_DIR, `${id}.json`);
  return fs.existsSync(filePath);
}
