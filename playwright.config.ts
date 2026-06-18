import process from "node:process";

import { defineConfig, devices } from "@playwright/test";



export default defineConfig({
  testDir: "e2e/specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5175",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "vite --config e2e/harness/vite.config.ts",
    url: "http://localhost:5175",
    reuseExistingServer: !process.env.CI,
  },
});
