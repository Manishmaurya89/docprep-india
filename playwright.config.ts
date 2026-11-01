import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    acceptDownloads: true,
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
      testMatch: /responsive|accessibility|hindi/,
    },
    // Opt-in: Playwright's Firefox could not launch in the environment where this suite was written
    // ("Could not find profile folder"), so it is not part of the default run. Enable with E2E_FIREFOX=1.
    ...(process.env.E2E_FIREFOX
      ? [{ name: "desktop-firefox", use: { ...devices["Desktop Firefox"] }, testMatch: /image-tools|pdf-tools|application-prep|errors|resilience/ }]
      : []),
    {
      // Safari engine (iPhone emulation): core journeys only. Run with --project=mobile-webkit.
      name: "mobile-webkit",
      use: { ...devices["iPhone 14"] },
      testMatch: /image-tools|pdf-tools|application-prep|errors|real-content|arrange-pages|hindi/,
    },
  ],
  webServer: {
    // Tests run against the production build so CSP and headers match deployment.
    command: `npm run start -- --hostname 127.0.0.1 --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
