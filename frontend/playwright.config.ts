import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end demo run (frontend/e2e/demo.spec.ts).
 *
 *   npm run e2e                                  → http://localhost:8080 (start API + Vite first)
 *   BASE_URL=https://<frontend>.vercel.app npm run e2e   → the hosted demo
 *
 * Two projects: a desktop browser and an iPhone-sized viewport for the
 * resident app (the staff console is always driven at desktop size).
 * Both run in Chromium so one browser download covers them.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "test-results",
  use: {
    baseURL: process.env["BASE_URL"] ?? "http://localhost:8080",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "iphone",
      use: { ...devices["iPhone 14"], browserName: "chromium" },
    },
  ],
});
