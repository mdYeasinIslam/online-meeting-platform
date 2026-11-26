import { test, expect, type Page } from "@playwright/test";
import { encodePhraseBundle } from "../src/@modules/research/phrase-training/dataset";
import { trainingSample } from "../tests/helpers/phrase-training-fixture.mjs";
async function openCollection(page: Page) {
  // Isolate the collector from unrelated auth/backend availability; no real account writes.
  await page.route("**/auth/me", route => route.fulfill({ status: 200, headers: { "access-control-allow-origin": route.request().headers().origin || "http://localhost:3015", "access-control-allow-credentials": "true" }, json: { user: { id: "synthetic-researcher", displayName: "Synthetic Researcher", email: "synthetic@example.test" } } }));
  await page.goto("/research/data-collection");
  await expect(page.getByRole("heading", { name: "Temporal landmark collection" })).toBeVisible();
}
async function phraseMode(page: Page) {
  await openCollection(page); await page.getByLabel("Collection mode", { exact: true }).selectOption("phrase");
  await expect(page.getByRole("heading", { name: "Phrase Training Collection — GRU V3 pilot" })).toBeVisible();
}
test("same route preserves research default and exposes provisional seven-class phrase settings", async ({ page }) => {
  await openCollection(page);
  await expect(page.getByLabel("Collection mode", { exact: true })).toHaveValue("research");
  await expect(page.getByText("0 active labels.", { exact: false })).toBeVisible();
  await page.getByLabel("Collection mode", { exact: true }).selectOption("phrase");
  await expect(page.getByLabel("Phrase label", { exact: true }).locator("option")).toHaveCount(8);
  await expect(page.getByRole("button", { name: "Start camera", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Record sample", exact: true })).toBeDisabled();
  await page.getByLabel("Phrase label", { exact: true }).selectOption("6");
  await expect(page.getByText("Unknown is negative-gesture data", { exact: false })).toBeVisible();
  await page.getByLabel("Recording duration", { exact: true }).selectOption("8000");
  await page.getByLabel("Countdown (seconds)", { exact: true }).fill("0");
  await expect(page.getByLabel("Target recordings per class")).toHaveValue("20");
  await expect(page).toHaveURL(/\/research\/data-collection$/);
  await page.getByLabel("Collection mode", { exact: true }).selectOption("research");
  await expect(page.getByRole("heading", { name: "Temporal landmark collection" })).toBeVisible();
});
test("phrase import requires acceptance, exports numeric arrays, and saved batches retain counts and duplicate screening", async ({ page }) => {
  const posts: string[] = [], models: string[] = [];
  page.on("request", request => { if (request.method() === "POST") posts.push(request.url()); if (request.url().includes("/phrase-model/")) models.push(request.url()); });
  await phraseMode(page);
  const source = encodePhraseBundle([trainingSample(1, 6)]);
  const upload = () => page.getByLabel("Import phrase dataset JSON", { exact: true }).setInputFiles({ name: "synthetic-phrase.json", mimeType: "application/json", buffer: Buffer.from(source) });
  await upload();
  await expect(page.getByRole("heading", { name: "Local phrase collection: 0 queued samples" })).toBeVisible();
  await expect(page.getByLabel("Collection mode", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Accept validated import", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Local phrase collection: 1 queued samples" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove downloaded samples from queue" })).toBeDisabled();
  const pending = page.waitForEvent("download"); await page.getByRole("button", { name: /Export phrase JSON/ }).click();
  const download = await pending, stream = await download.createReadStream(); const chunks: Buffer[] = [];
  if (!stream) throw new Error("No exported JSON stream."); for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const exported = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  expect(exported.kind).toBe("bdsl-phrase-training"); expect(exported.samples[0].values).toHaveLength(32); expect(exported.samples[0].values[0]).toHaveLength(128); expect(exported.samples[0].label).toBe(6);
  expect(JSON.stringify(exported)).not.toContain("synthetic@example.test");
  await page.getByLabel("I verified that the downloaded JSON batch files were saved.", { exact: true }).check();
  await page.getByRole("button", { name: "Remove downloaded samples from queue" }).click();
  await expect(page.getByRole("heading", { name: "Local phrase collection: 0 queued samples" })).toBeVisible();
  await expect(page.getByText("1/20 (0 queued, 1 saved)", { exact: false })).toBeVisible();
  await upload(); await expect(page.locator('p[role="alert"]')).toContainText("Duplicate sample ID");
  expect(posts).toEqual([]); expect(models).toEqual([]);
  await page.screenshot({ path: "/tmp/phrase-v3-collection.png", fullPage: true });
});

test("actual detector with synthetic no-hand camera supports review, re-record and camera cleanup", async ({ page, context }) => {
  test.skip(process.env.COLLECTION_CAMERA !== "1", "Opt-in real MediaPipe with synthetic no-hand camera; does not test sign accuracy."); test.setTimeout(120000);
  await context.grantPermissions(["camera"]);
  await page.addInitScript(() => {
    const state = window as Window & { collectionTracks?: MediaStreamTrack[] }; state.collectionTracks = [];
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => { const stream = await original(constraints); state.collectionTracks!.push(...stream.getTracks()); return stream; };
  });
  await phraseMode(page);
  await page.getByLabel("Participant ID", { exact: true }).fill("P001"); await page.getByLabel("Session ID", { exact: true }).fill("S001");
  await page.getByLabel("Phrase label", { exact: true }).selectOption("6"); await page.getByLabel("Countdown (seconds)", { exact: true }).fill("0");
  await page.getByLabel("I acknowledge these provisional definitions", { exact: false }).check();
  await page.getByLabel("I confirm participant consent", { exact: false }).check();
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(page.getByRole("button", { name: "Record sample", exact: true })).toBeEnabled({ timeout: 45000 });
  await page.getByRole("button", { name: "Record sample", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Sample review:.*rejected/ })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("button", { name: "Accept sample", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Discard and re-record", exact: true }).click();
  await expect(page.getByRole("button", { name: "Cancel take", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Cancel take", exact: true }).click();
  await page.getByRole("button", { name: "Stop camera", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Window & { collectionTracks: MediaStreamTrack[] }).collectionTracks.every(track => track.readyState === "ended"))).toBe(true);
});
