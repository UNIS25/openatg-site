process.loadEnvFile(".env.local");
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["json", { outputFile: "artifacts/playwright-results.json" }],
  ],
  outputDir: "artifacts/playwright",
  use: {
    baseURL: "http://127.0.0.1:4190",
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      testMatch: [
        "storefront.spec.ts",
        "final-experience.spec.ts",
        "resilience.spec.ts",
      ],
      use: { viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "tablet",
      testMatch: ["storefront.spec.ts", "final-experience.spec.ts"],
      use: { viewport: { width: 1024, height: 1000 } },
    },
    {
      name: "mobile",
      testMatch: ["storefront.spec.ts", "final-experience.spec.ts"],
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "narrow",
      testMatch: ["storefront.spec.ts", "final-experience.spec.ts"],
      use: {
        viewport: { width: 350, height: 780 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "accounts",
      testMatch: ["accounts.spec.ts", "editorial-admin.spec.ts"],
      use: { viewport: { width: 1440, height: 1000 } },
    },
  ],
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:4190/",
    reuseExistingServer: true,
    timeout: 60000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
