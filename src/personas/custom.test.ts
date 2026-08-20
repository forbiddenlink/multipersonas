import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getAllPersonas, saveCustomPersona, hasProjectPersonas, personaSource, projectDir, PROJECT_DIR } from "./custom.js";
import { personaLibrary } from "./library.js";
import type { Persona } from "./types.js";

/**
 * Personas live in the repo, not in a home directory: different projects have
 * different users, CI cannot read ~/, and a persona nobody can review in a PR
 * is a persona nobody agreed to.
 */
let cwd: string;
const persona = (id: string): Persona =>
  ({ id, name: id, description: "d", goals: [], frustrations: [], techProficiency: 3,
     viewport: { width: 1440, height: 900 }, isMobile: false, connectionSpeed: "fast",
     kind: "ux", inputModality: "pointer", maxSteps: 10, patienceLevel: "medium",
     systemPrompt: "p" }) as unknown as Persona;

beforeEach(() => {
  cwd = fs.mkdtempSync(path.join(os.tmpdir(), "mp-project-"));
});
afterEach(() => {
  fs.rmSync(cwd, { recursive: true, force: true });
});

describe("project personas", () => {
  it("writes into the project directory, not the home directory", () => {
    const at = saveCustomPersona(persona("checkout-shopper"), cwd);
    expect(at).toBe(path.join(cwd, PROJECT_DIR, "checkout-shopper.json"));
    expect(at.startsWith(os.homedir() + "/.mpersonas")).toBe(false);
    expect(fs.existsSync(at)).toBe(true);
  });

  it("round-trips a saved persona", () => {
    saveCustomPersona(persona("enterprise-admin"), cwd);
    expect(getAllPersonas(cwd)["enterprise-admin"]).toBeDefined();
    expect(personaSource("enterprise-admin", cwd)).toBe("project");
  });

  it("reports whether the project defines its own personas", () => {
    expect(hasProjectPersonas(cwd)).toBe(false);
    saveCustomPersona(persona("x"), cwd);
    expect(hasProjectPersonas(cwd)).toBe(true);
  });

  it("lets a project persona override a built-in of the same id", () => {
    const builtinId = Object.keys(personaLibrary)[0]!;
    const mine = { ...persona(builtinId), name: "Ours" } as Persona;
    saveCustomPersona(mine, cwd);
    expect(getAllPersonas(cwd)[builtinId]!.name).toBe("Ours");
    expect(personaSource(builtinId, cwd)).toBe("project");
  });

  it("still offers the built-in library when the project has none", () => {
    expect(Object.keys(getAllPersonas(cwd)).length).toBeGreaterThan(0);
    expect(personaSource(Object.keys(personaLibrary)[0]!, cwd)).toBe("builtin");
  });

  it("skips a malformed file instead of losing every other persona", () => {
    saveCustomPersona(persona("good"), cwd);
    fs.writeFileSync(path.join(projectDir(cwd), "broken.json"), "{not json");
    expect(getAllPersonas(cwd)["good"]).toBeDefined();
  });

  it("does not treat Object.prototype keys as built-in personas", () => {
    expect(personaSource("constructor", cwd)).toBe("unknown");
    expect(personaSource("toString", cwd)).toBe("unknown");
    expect(personaSource("__proto__", cwd)).toBe("unknown");
  });

  it("survives a project with no personas directory", () => {
    expect(() => getAllPersonas(cwd)).not.toThrow();
    expect(hasProjectPersonas(cwd)).toBe(false);
  });
});
