import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { isValidPersonaId } from "./types.js";
import { getAllPersonas, saveCustomPersona, deleteCustomPersona, hasProjectPersonas, personaSource, projectDir, PROJECT_DIR } from "./custom.js";
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

describe("persona id safety (AIR-001)", () => {
  const bad = ["../package", "..", "a/b", "a\\b", "A-B", "-lead", "", "x".repeat(65), "a.json", "a b"];

  it("refuses to save a persona whose id could escape the persona directory", () => {
    fs.writeFileSync(path.join(cwd, "package.json"), "{}\n");
    for (const id of bad) {
      expect(() => saveCustomPersona(persona(id), cwd), JSON.stringify(id)).toThrow(/persona id/i);
    }
    expect(fs.readFileSync(path.join(cwd, "package.json"), "utf-8")).toBe("{}\n");
  });

  it("refuses to delete by an unsafe id", () => {
    for (const id of bad) {
      expect(() => deleteCustomPersona(id, cwd), JSON.stringify(id)).toThrow(/persona id/i);
    }
  });

  it("accepts every built-in id", () => {
    for (const id of [...Object.keys(personaLibrary), "first-time-visitor", "keyboard-traversal", "mobile-slow-connection"]) {
      expect(isValidPersonaId(id), id).toBe(true);
    }
  });
});
