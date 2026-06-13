import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";



const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * @description
 * Vite configuration for the local development sandbox.
 */
export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      "@eo-typewriterjs": resolve(__dirname, "../src/index.ts"),
    },
  },
  server: {
    port: 5174,
    open: true,
  },
});
