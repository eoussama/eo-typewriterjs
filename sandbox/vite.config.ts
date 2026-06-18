import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { env } from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";



const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string; repository: { url: string } };



/**
 * @description
 * Vite configuration for the local development sandbox.
 */
export default defineConfig({
  root: __dirname,
  base: env.VITE_BASE ?? "/",
  define: {
    __PKG_VERSION__: JSON.stringify(pkg.version),
    __PKG_REPO__: JSON.stringify(pkg.repository.url),
  },
  resolve: {
    alias: {
      "@eo-typewriterjs": resolve(__dirname, "../src/index.ts"),
    },
  },
  build: {
    outDir: resolve(__dirname, "../dist-sandbox"),
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    open: true,
  },
});
