import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e", workers: 1, timeout: 45000,
  use: { baseURL: "http://localhost:3000", browserName: "chromium", headless: true,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined) },
  },
  webServer: [
    { command: "npm --prefix ../online-meeting-platform-server run test:serve", url: "http://localhost:5000/health", reuseExistingServer: false, timeout: 60000 },
    { command: "npm run start -- --port 3000", url: "http://localhost:3000", reuseExistingServer: false, timeout: 60000 },
  ],
});
