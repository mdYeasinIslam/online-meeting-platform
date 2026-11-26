import { test, expect } from "@playwright/test";

test("phrase demo initializes the actual GRU in Chromium without exposing reference landmarks", async ({ page, request }) => {
  const failures: string[] = [];
  page.on("pageerror", error => failures.push(error.message));
  let modelRequests = 0;
  page.on("request", request => { if (request.url().endsWith("/phrase-model/model.json")) modelRequests++; });
  await page.goto("/phrase-demo");
  await expect(page.getByRole("heading", { name: "Bangla Sign Language — Live Phrase Recognition" })).toBeVisible();
  await expect(page.getByTestId("phrase-model-status")).toHaveText("Ready", { timeout: 45000 });
  await expect(page.getByRole("button", { name: "Start Camera", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Start Recording", exact: true })).toBeDisabled();
  for (const phrase of ["হ্যালো", "শুভ সকাল", "শুভরাত্রি", "আপনি কেমন আছেন?", "আমি ভালো আছি"]) await expect(page.locator("li").filter({ hasText: phrase })).toBeVisible();
  expect(modelRequests).toBe(1);
  expect((await request.get("/phrase-model/reference.json")).status()).toBe(404);
  expect(failures).toEqual([]);
  await page.screenshot({ path: "/tmp/phrase-demo.png", fullPage: true });
  // Deliberately no mocked model, fake predictions, or claims about webcam accuracy.
});

test("local signer clip runs through actual browser MediaPipe and GRU", async ({ page }) => {
  test.skip(process.env.PHRASE_VIDEO !== "1", "Opt in with PHRASE_VIDEO=1; requires local signer clip and MediaPipe CDN access.");
  test.setTimeout(120000);
  page.on("pageerror", error => console.warn("Browser page error:", error.message));
  page.on("console", entry => { if (entry.type() === "error") console.warn("Browser error:", entry.text()); });
  await page.goto("/phrase-demo");
  await expect(page.getByTestId("phrase-model-status")).toHaveText("Ready", { timeout: 45000 });
  await page.getByLabel("Input source", { exact: true }).selectOption("video");
  await page.getByLabel("Local video file", { exact: true }).setInputFiles("phrase-pilot/clips/good_morning.mp4");
  await page.getByRole("button", { name: "Start Video", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start Recording", exact: true })).toBeEnabled({ timeout: 60000 });
  await page.getByRole("button", { name: "Start Recording", exact: true }).click();
  await expect.poll(async () => Number(await page.getByTestId("phrase-raw-hands").textContent()), { timeout: 15000 }).toBeGreaterThan(0);
  const overlay = page.getByTestId("phrase-hand-overlay");
  await expect(overlay).toHaveClass(/-scale-x-100/);
  await expect(page.getByText(/Prediction confidence:/)).toBeVisible({ timeout: 30000 });
  await expect(page.locator('p[role="alert"]')).toHaveCount(0);
  await page.screenshot({ path: "/tmp/phrase-video-result.png", fullPage: true });
  console.info("Real-clip browser result:", await page.getByText(/Prediction confidence:/).textContent());
  // This checks execution, not independent recognition accuracy or live webcam quality.
});
