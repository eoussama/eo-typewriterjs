import type { TestProjectInlineConfiguration, ViteUserConfig } from "vitest/config";
import process from "node:process";
import { defineConfig } from "vitest/config";



const unit: TestProjectInlineConfiguration = {
  test: {
    name: "unit",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/smoke/**"],
    environment: "node",
  },
};

// Runs against the built `dist/`, so it's left out of mutation testing runs.
const smoke: TestProjectInlineConfiguration = {
  test: {
    name: "smoke",
    include: ["tests/smoke/**/*.test.ts"],
    environment: "node",
  },
};

const config: ViteUserConfig = defineConfig({
  test: {
    projects: process.env.STRYKER_MUTATOR_WORKER === undefined ? [unit, smoke] : [unit],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        // Barrel files only re-export; they hold no executable logic.
        "src/core/**/index.ts",
        "src/renderers/**/index.ts",
        // Snippet runner used by the docs playground and sandbox, not part of the published library.
        "src/devtools/**",
      ],
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "coverage",
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});

export default config;
