import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";
const port = Number(process.env.PHRASE_TEST_PORT || 3015);
export default defineConfig({
  testDir: "./e2e", testMatch: ["phrase-demo.spec.ts", "phrase-collection.spec.ts"], workers: 1, timeout: 60000,
  use: { baseURL: `http://localhost:${port}`, browserName: "chromium", headless: true,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined), args: process.env.COLLECTION_CAMERA === "1" ? ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"] : [] },
  },
  webServer: { command: `npm run start -- --port ${port}`, url: `http://localhost:${port}/phrase-demo`, reuseExistingServer: false, timeout: 60000 },
});
