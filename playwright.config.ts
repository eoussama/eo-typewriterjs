import type { PlaywrightTestConfig } from "@playwright/test";

import process from "node:process";
import { defineConfig, devices } from "@playwright/test";



const HARNESS_URL = "http://localhost:5175";
const SITE_URL = "http://localhost:4173";

const config: PlaywrightTestConfig = defineConfig({
  testDir: "e2e/specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    trace: "on-first-retry",
  },
  projects: [
    // Library scenarios rendered by a bare page.
    {
      name: "harness",
      testDir: "e2e/specs/harness",
      use: { ...devices["Desktop Chrome"], baseURL: HARNESS_URL },
    },
    // The built docs site and its sandbox; run `pnpm docs:build` first.
    {
      name: "site",
      testDir: "e2e/specs/site",
      use: { ...devices["Desktop Chrome"], baseURL: SITE_URL },
    },
  ],
  webServer: [
    {
      command: "vite --config e2e/harness/vite.config.ts",
      url: HARNESS_URL,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "vitepress preview docs --port 4173",
      url: SITE_URL,
      reuseExistingServer: !process.env.CI,
    },
  ],
});

export default config;
