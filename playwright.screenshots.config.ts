// Captures README screenshots into docs/screenshots: npx playwright test -c playwright.screenshots.config.ts
// Kept separate from playwright.config.ts so CI does not run it.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "scripts/screenshots",
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: { baseURL: "http://localhost:3000", ...devices["Desktop Chrome"], viewport: { width: 1280, height: 860 } },
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 240_000 },
});
