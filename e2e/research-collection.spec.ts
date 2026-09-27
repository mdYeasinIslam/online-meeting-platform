import { test, expect, type Page } from "@playwright/test";
import { vocabulary, sample } from "../tests/helpers/research-fixture.mjs";
async function openResearch(page: Page) {
  await page.goto("/research/data-collection");
  await expect(page).toHaveURL(/\/auth/);
  await page.getByRole("button", { name: "Create an account", exact: true }).click();
  await page.getByLabel("Display name").fill("Browser Researcher");
  await page.getByLabel("Email", { exact: true }).fill(`research-${Date.now()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("temporary browser password 123");
  await page.getByRole("button", { name: "Register", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("link", { name: "Data collection", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Temporal landmark collection" })).toBeVisible();
}
async function loadVocabulary(page: Page) {
  await page.getByLabel("Load reviewed vocabulary JSON").setInputFiles({ name: "synthetic-vocabulary.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(vocabulary())) });
  await expect(page.getByRole("heading", { name: "Vocabulary: synthetic-tests-only" })).toBeVisible();
}
test("research route is protected; consent and reviewed vocabulary gate capture", async ({ page }) => {
  await openResearch(page);
  await expect(page.getByText("0 active labels.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start camera", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Record sample", exact: true })).toBeDisabled();
  await loadVocabulary(page);
  await page.getByLabel("Participant ID", { exact: true }).fill("P001");
  await page.getByLabel("Session ID", { exact: true }).fill("S001");
  await page.getByRole("combobox", { name: "Reviewed vocabulary label", exact: true }).selectOption("greeting");
  await expect(page.getByRole("button", { name: "Record sample", exact: true })).toBeDisabled();
});
test("synthetic import, review, per-label counts, export privacy and explicit clear confirmation", async ({ page }) => {
  await openResearch(page); await loadVocabulary(page);
  const fixture = { schemaVersion: 1, kind: "bdsl-temporal-landmarks", samples: [sample()] };
  await page.getByLabel("Import sample bundle").setInputFiles({ name: "synthetic.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(fixture)) });
  await page.getByRole("button", { name: "Accept validated import", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Local collection: 1 samples" })).toBeVisible();
  await expect(page.getByText("অভিবাদন: 1", { exact: true })).toBeVisible();
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Export JSON" }).click();
  const stream = await (await download).createReadStream(); const chunks: Buffer[] = [];
  if (!stream) throw new Error("Export stream unavailable");
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const source = Buffer.concat(chunks).toString("utf8"), parsed = JSON.parse(source);
  expect(parsed.samples[0].frames[0].left.landmarks).toHaveLength(21);
  for (const forbidden of ["Browser Researcher", "@example.com", "csrf", "cookie", "accessToken", "password"]) expect(source).not.toContain(forbidden);
  page.once("dialog", dialog => dialog.dismiss()); await page.getByRole("button", { name: "Clear local samples" }).click();
  await expect(page.getByRole("heading", { name: "Local collection: 1 samples" })).toBeVisible();
  page.once("dialog", dialog => dialog.accept()); await page.getByRole("button", { name: "Clear local samples" }).click();
  await expect(page.getByRole("heading", { name: "Local collection: 0 samples" })).toBeVisible();
  await page.getByLabel("Import sample bundle").setInputFiles({ name: "invalid.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ ...fixture, token: "unsafe" })) });
  await expect(page.getByRole("main").getByRole("alert")).toContainText("unexpected fields");
});
type ResearchWindow = Window & { researchTracks: MediaStreamTrack[]; researchCameraCalls: number; researchAudioCalls: number };
test("real detector with synthetic camera records a rejected no-hand take, cancels and releases resources", async ({ page, context }) => {
  test.skip(process.env.DAY4_CAMERA !== "1" && process.env.DAY2_LIVEKIT !== "1", "Opt in to actual detector/synthetic-camera verification.");
  test.setTimeout(120000);
  await context.grantPermissions(["camera"]);
  await page.addInitScript(() => {
    const state = window as unknown as ResearchWindow; state.researchTracks = []; state.researchCameraCalls = 0; state.researchAudioCalls = 0;
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => {
      state.researchCameraCalls++; if (constraints?.audio) state.researchAudioCalls++;
      const stream = await original(constraints); state.researchTracks.push(...stream.getTracks()); return stream;
    };
  });
  const assetRequests: string[] = [];
  page.on("request", request => { if (request.url().includes("cdn.jsdelivr.net/npm/@mediapipe/hands")) assetRequests.push(request.url()); });
  await openResearch(page); await loadVocabulary(page);
  expect(await page.evaluate(() => (window as unknown as ResearchWindow).researchCameraCalls)).toBe(0);
  await page.getByLabel("Participant ID", { exact: true }).fill("P001");
  await page.getByLabel("Session ID", { exact: true }).fill("S001");
  await page.getByRole("combobox", { name: "Reviewed vocabulary label", exact: true }).selectOption("greeting");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(page.getByText("Camera/detector: ready.", { exact: false })).toBeVisible({ timeout: 45000 });
  await expect.poll(() => page.locator("video").evaluate(video => video instanceof HTMLVideoElement ? video.videoWidth : 0)).toBeGreaterThan(0);
  const assetsAfterStart = assetRequests.length;
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  const heap = async () => {
    await cdp.send("HeapProfiler.collectGarbage");
    const metrics = await cdp.send("Performance.getMetrics");
    return metrics.metrics.find(metric => metric.name === "JSHeapUsedSize")?.value ?? null;
  };
  const heapBefore = await heap();
  for (let take = 0; take < 3; take++) {
    await page.getByRole("button", { name: "Record sample", exact: true }).click();
    await expect(page.getByText("Prepare:", { exact: false })).toBeVisible();
    await expect(page.getByRole("region", { name: "Sample review", exact: true })).toBeVisible({ timeout: 15000 });
    const review = page.getByRole("region", { name: "Sample review", exact: true });
    await expect(review).toContainText("No hand detected");
    await expect(review.getByRole("button", { name: "Accept sample" })).toBeDisabled();
    console.info(`Synthetic no-hand browser take ${take + 1}:`, await review.locator("p").first().textContent());
    await page.getByRole("button", { name: "Discard sample" }).click();
  }
  await page.getByRole("button", { name: "Record sample", exact: true }).click();
  await expect(page.getByText(/^Recording:/)).toBeVisible();
  await page.getByRole("button", { name: "Cancel take" }).click();
  await expect(page.getByRole("button", { name: "Record sample", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => (window as unknown as ResearchWindow).researchCameraCalls)).toBe(1);
  expect(await page.evaluate(() => (window as unknown as ResearchWindow).researchAudioCalls)).toBe(0);
  expect(assetRequests.length).toBe(assetsAfterStart);
  console.info("Development JS heap bytes after forced GC, before/after three synthetic no-hand takes (not WASM/GPU or formal memory evaluation):", { before: heapBefore, after: await heap() });
  await cdp.detach();
  await page.getByRole("button", { name: "Stop camera", exact: true }).click();
  await expect(page.getByText("Camera/detector: off.", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as ResearchWindow).researchTracks.every(track => track.readyState === "ended"))).toBe(true);
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(page.getByText("Camera/detector: ready.", { exact: false })).toBeVisible({ timeout: 30000 });
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect.poll(() => page.evaluate(() => (window as unknown as ResearchWindow).researchTracks.every(track => track.readyState === "ended"))).toBe(true);
});
