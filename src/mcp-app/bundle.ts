import * as fs from "fs";
import { createRequire } from "node:module";

/**
 * The MCP Apps view runs in a sandboxed iframe with no network and no module loader, so
 * the ext-apps browser runtime has to travel inside the HTML. Its prebuilt bundle is one
 * ES module that ends in a single `export{...}`. Rewriting that export as a local object
 * lets the view script sit in the same inline <script> and reach the runtime by name,
 * with no bundler in this repo's build.
 */
export const RUNTIME_BINDING = "__extApps";

export function inlineModule(source: string, binding: string = RUNTIME_BINDING): string {
  if (new RegExp(`\\b${binding}\\b`).test(source)) throw new Error(`ext-apps bundle already uses the name ${binding}`);
  const start = source.lastIndexOf("export{");
  if (start === -1) throw new Error("ext-apps bundle has no trailing export statement");
  const end = source.indexOf("}", start);
  if (end === -1 || source.slice(end + 1).replace(/[;\s]/g, "") !== "") {
    throw new Error("ext-apps bundle export is not the last statement");
  }
  if (source.slice(0, start).includes("export{") || /(^|[;}\s])import[\s{*("']/.test(source.slice(0, start))) {
    throw new Error("ext-apps bundle is not a single self-contained module");
  }
  const entries = source
    .slice(start + "export{".length, end)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [local, exported] = part.split(/\s+as\s+/);
      return `${JSON.stringify(exported ?? local)}:${local}`;
    });
  return `${source.slice(0, start)}const ${binding}={${entries.join(",")}};`;
}

let cached: string | undefined;

/** The ext-apps runtime, rewritten for inlining. Read once per server process. */
export function loadExtAppsRuntime(): string {
  if (cached) return cached;
  const req = createRequire(import.meta.url);
  const file = req.resolve("@modelcontextprotocol/ext-apps/app-with-deps");
  cached = inlineModule(fs.readFileSync(file, "utf8"));
  return cached;
}
