import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";



const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * @description
 * Vite configuration for building the package in library mode.
 */
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "EoTypewriterjs",
      formats: ["es", "cjs"],
      fileName: format => (format === "es" ? "index.js" : "index.cjs"),
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
    },
  },
});
