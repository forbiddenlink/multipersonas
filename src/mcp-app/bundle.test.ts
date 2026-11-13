import { describe, it, expect } from "vitest";
import { inlineModule, loadExtAppsRuntime, RUNTIME_BINDING } from "./bundle.js";

describe("inlineModule", () => {
  it("turns the trailing export into a local object, keeping aliases", () => {
    const out = inlineModule("var a=1;function b(){};export{a as Alpha,b};", "x");
    expect(out).toBe('var a=1;function b(){};const x={"Alpha":a,"b":b};');
    expect(new Function(`${out}return x;`)()).toMatchObject({ Alpha: 1 });
  });

  it.each([
    ["no export", "var a=1;"],
    ["code after the export", "var a=1;export{a};console.log(a);"],
    ["two exports", "export{a};var a=1;export{a};"],
    ["an import", 'import x from "y";var a=1;export{a};'],
  ])("refuses a bundle with %s", (_label, source) => {
    expect(() => inlineModule(source)).toThrow();
  });
});

describe("loadExtAppsRuntime", () => {
  it("exposes the App class and theming helpers from the installed bundle", () => {
    const runtime = loadExtAppsRuntime();
    expect(runtime).not.toMatch(/\bexport\s*\{/);
    for (const name of ["App", "applyDocumentTheme", "applyHostStyleVariables", "applyHostFonts"]) {
      expect(runtime).toContain(`"${name}":`);
    }
    expect(runtime).toContain(`const ${RUNTIME_BINDING}=`);
  });
});
