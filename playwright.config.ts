import { defineConfig, devices } from "@playwright/test";

const artifactDirectory = process.env.AGENT_ARTIFACTS;

export default defineConfig({
  testDir: "./e2e",
  outputDir: artifactDirectory
    ? `${artifactDirectory}/playwright-results`
    : "test-results",
  reporter: artifactDirectory
    ? [
        ["list"],
        [
          "html",
          {
            open: "never",
            outputFolder: `${artifactDirectory}/playwright-report`,
          },
        ],
      ]
    : "list",
  use: {
    ...devices["Desktop Chrome"],
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    baseURL: "http://127.0.0.1:4173",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
