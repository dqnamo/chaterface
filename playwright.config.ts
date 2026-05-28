import { defineConfig, devices } from "@playwright/test";

const hasAuthState = Boolean(process.env.E2E_AUTH_STORAGE_STATE);
const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const shouldStartLocalServer =
  hasAuthState &&
  !process.env.E2E_BASE_URL &&
  process.env.PLAYWRIGHT_START_SERVER !== "0";

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  reporter: process.env.CI ? "github" : "list",
  retries: process.env.CI ? 1 : 0,
  testDir: "./tests/e2e",
  timeout: 90_000,
  use: {
    baseURL,
    storageState: process.env.E2E_AUTH_STORAGE_STATE || undefined,
    trace: "retain-on-failure",
  },
  webServer: shouldStartLocalServer
    ? {
        command: "pnpm dev:app",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        url: baseURL,
      }
    : undefined,
});
