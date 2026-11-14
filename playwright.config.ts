import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
// deploy.yml sets E2E_BASE_URL to the deployed preview/production URL; otherwise we start a local server.
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
// CI runs against a production build (`npm run build && npm run start`); locally `next dev` is faster.
const serverCommand = process.env.E2E_SERVER_COMMAND ?? "npm run dev";
// Optional: lets Playwright through Vercel Deployment Protection if previews are ever hosted on Vercel.
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  // Local runs use `next dev`, which compiles each page on first visit; bcrypt (cost 12) is slow too.
  workers: process.env.CI ? 2 : 3,
  expect: { timeout: 15_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    extraHTTPHeaders: bypassSecret
      ? { "x-vercel-protection-bypass": bypassSecret, "x-vercel-set-bypass-cookie": "true" }
      : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: serverCommand,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
      },
});
