/// <reference types="vitest/config" />

import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/build/**"],
    // Isolate test files for better parallelization and avoiding state leakage
    isolate: true,
    // Use threads for parallel execution (Vitest 4 uses top-level options)
    maxWorkers: undefined, // Use default (number of CPUs)
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./tests/reports/coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/vite-env.d.ts",
        "src/**/*.d.ts",
        "src/test/**",
        "src/index.tsx",
        "src/main.tsx", // Entry point, not testable
        "src/App.tsx", // Root component, test via integration
      ],
      // Initial thresholds - raise as coverage increases
      thresholds: {
        statements: 8,
        branches: 5,
        functions: 5,
        lines: 8,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    // Retry flaky tests once in CI
    retry: process.env.CI ? 1 : 0,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
