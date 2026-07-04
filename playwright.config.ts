import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Runs against a production build on its own port, not `next dev`: React's
  // Strict Mode double-invokes effects in dev, which aborts the /api/plan
  // and /api/budget SSE fetches (their cleanup calls controller.abort()) and
  // leaves the page stuck loading. Production doesn't double-invoke, and a
  // dedicated port avoids clashing with a dev server on :3000.
  webServer: {
    command: "npm run build && npm run start -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 12"], viewport: { width: 390, height: 844 } },
    },
  ],
});
