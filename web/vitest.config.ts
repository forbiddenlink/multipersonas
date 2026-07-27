import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@engine": path.resolve(__dirname, "../src"),
      // The `server-only` guard throws in a client bundle; harmless (and unwanted)
      // in the test runner, where server modules are imported directly.
      "server-only": path.resolve(__dirname, "./src/__tests__/server-only-stub.ts"),
    },
  },
});
