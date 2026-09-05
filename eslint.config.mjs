// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // web/ has its own eslint-config-next setup. Root lint covers the CLI,
    // worker and experiments/scripts, and never touches build output.
    ignores: [
      "dist/**",
      ".vercel/**",
      "node_modules/**",
      "web/**",
      "worker/dist/**",
      "worker/node_modules/**",
      // video/ is a standalone Remotion project with its own tooling and tsconfig,
      // isolated from the workspace. Not part of the root CLI lint.
      "video/**",
      "coverage/**",
    ],
  },
  js.configs.recommended,
  // typescript-eslint "recommended" (not type-checked/strict-type-checked) —
  // deliberately lint-only, no type info, to avoid a huge error cascade on
  // code that has never been linted before.
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "worker/src/**/*.ts", "experiments/**/*.ts", "scripts/**/*.ts"],
    rules: {
      // Unused vars/args prefixed with _ are intentional (destructuring,
      // ignored catch bindings) — don't flag them.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // Downgraded, not disabled: the CLI leans on `any` for third-party
      // (Playwright/axe) shapes and dynamic report data. Rewriting that
      // surface to satisfy a brand-new linter is broad churn on working
      // code (change-discipline) — warn so new code gets nudged instead.
      "@typescript-eslint/no-explicit-any": "warn",
      // Empty catch blocks / intentionally-unused error bindings show up
      // in retry/cleanup paths; keep as a warning, not a blocker.
      "@typescript-eslint/no-empty-object-type": "warn",
    },
  },
  {
    // Standalone Node scripts (dogfood runner, etc.) — plain .mjs run with `node`,
    // so declare the Node globals they use rather than tripping no-undef.
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        URL: "readonly",
        setTimeout: "readonly",
        // referenced inside browser-injected addInitScript / page.evaluate callbacks,
        // not Node scope
        window: "readonly",
        document: "readonly",
      },
    },
  },
);
