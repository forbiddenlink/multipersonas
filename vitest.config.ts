import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The web app has its own vitest config (jsdom + React). This root config
    // covers the CLI/engine only, which is plain Node.
    include: ["src/**/*.test.ts", "experiments/**/*.test.ts", "worker/src/**/*.test.ts"],
    environment: "node",
  },
});
