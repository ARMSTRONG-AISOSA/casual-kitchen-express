import { defineConfig, devices } from "@playwright/test";

// Website checks (architecture.md 15.4): a small phone and a desktop, against the built files.
export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:4173/casual-kitchen-express/" },
  projects: [
    { name: "phone", use: { ...devices["Pixel 5"], viewport: { width: 360, height: 740 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "node tests/serve.mjs",
    url: "http://localhost:4173/casual-kitchen-express/",
    reuseExistingServer: !process.env.CI,
  },
});
