import { test, expect, type Browser, type Page } from "@playwright/test";
import { DataPacket, DataPacket_Kind, UserPacket } from "@livekit/protocol";
import { randomUUID } from "node:crypto";
import { CAPTION_CONFIG } from "../src/@modules/captions/config";
test.skip(process.env.DAY2_LIVEKIT !== "1", "Actual caption transport tests require DAY2_LIVEKIT=1.");
type InstrumentedWindow = Window & { captionChannels: RTCDataChannel[]; captionPeers: RTCPeerConnection[]; cameraRequests: number };
async function participant(browser: Browser, name: string, invite?: string) {
  const context = await browser.newContext({ baseURL: "http://localhost:3000", permissions: ["camera", "microphone"] });
  await context.addInitScript(() => {
    const state = window as unknown as InstrumentedWindow;
    state.captionChannels = []; state.captionPeers = []; state.cameraRequests = 0;
    const Original = window.RTCPeerConnection;
    window.RTCPeerConnection = class extends Original {
      constructor(config?: RTCConfiguration) { super(config); state.captionPeers.push(this); }
      createDataChannel(label: string, options?: RTCDataChannelInit) {
        const channel = super.createDataChannel(label, options); state.captionChannels.push(channel); return channel;
      }
    };
    const capture = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async options => { if (options?.video) state.cameraRequests++; return capture(options); };
  });
  const page = await context.newPage();
  await page.goto(invite || "/dashboard");
  await page.getByRole("button", { name: "Create an account", exact: true }).click();
  await page.getByLabel("Display name").fill(name);
  await page.getByLabel("Email", { exact: true }).fill(`${randomUUID()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("browser test password 123");
  await page.getByRole("button", { name: "Register", exact: true }).click();
  await expect(page).toHaveURL(invite || /\/dashboard$/);
  return { page, context };
}
async function join(page: Page, microphone = false) {
  await page.getByLabel("Microphone on when joining").setChecked(microphone);
  await page.getByRole("button", { name: "Join meeting", exact: true }).click();
  await expect(page.getByText("Connected", { exact: true })).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole("button", { name: "Turn camera off", exact: true })).toBeEnabled({ timeout: 20000 });
}
async function receivedCounters(page: Page) {
  return page.evaluate(async () => {
    let audioBytes = 0; let videoFrames = 0;
    for (const peer of (window as unknown as InstrumentedWindow).captionPeers) {
      if (peer.connectionState === "closed") continue;
      for (const report of (await peer.getStats()).values()) {
        if (report.type === "inbound-rtp" && report.kind === "audio") audioBytes += report.bytesReceived ?? 0;
        if (report.type === "inbound-rtp" && report.kind === "video") videoFrames += report.framesDecoded ?? 0;
      }
    }
    return { audioBytes, videoFrames };
  });
}

async function sendFixture(page: Page, text: string, id = randomUUID(), spoofId = "forged-user") {
  const identity = await page.locator('article[data-local="true"]').getAttribute("data-participant");
  if (!identity) throw new Error("Test participant identity missing");
  const payload = new TextEncoder().encode(JSON.stringify({ version: 1, type: "caption", payload: { id, participantId: spoofId, participantName: "Forged Host", source: "sign", text, timestamp: Date.now() } }));
  // Test-only injected packet, not an application prediction or a production send backdoor.
  const bytes = new DataPacket({ kind: DataPacket_Kind.RELIABLE, value: { case: "user", value: new UserPacket({ participantIdentity: identity, payload, topic: CAPTION_CONFIG.topic }) } }).toBinary();
  await page.evaluate(data => {
    const channel = (window as unknown as InstrumentedWindow).captionChannels.find(item => item.label === "_reliable" && item.readyState === "open");
    if (!channel) throw new Error("Reliable LiveKit test channel unavailable");
    channel.send(new Uint8Array(data));
  }, Array.from(bytes));
  return id;
}

test("real caption delivery validates sender, deduplicates, isolates sessions and renders text safely", async ({ browser }) => {
  test.setTimeout(120000);
  const a = await participant(browser, "Caption Alice");
  const contexts = [a.context];
  try {
    await a.page.getByRole("button", { name: "Create meeting", exact: true }).click();
    await expect(a.page.getByRole("button", { name: "Join meeting", exact: true })).toBeVisible();
    const invite = a.page.url(); await join(a.page);
    const b = await participant(browser, "Caption Bob", invite); contexts.push(b.context); await join(b.page);
    await expect(a.page.locator("article[data-participant]")).toHaveCount(2);
    const first = await sendFixture(a.page, "কখ"); await sendFixture(a.page, "কখ", first);
    await expect(b.page.locator("[data-caption-id]")).toHaveCount(1);
    await expect(b.page.locator("[data-caption-id]")).toContainText("Caption Alice");
    await expect(b.page.locator("[data-caption-id]")).toContainText("কখ");
    await expect(b.page.getByText("Forged Host", { exact: true })).toHaveCount(0);
    const aliceId = await a.page.locator('article[data-local="true"]').getAttribute("data-participant");
    await sendFixture(b.page, "অ", randomUUID(), aliceId!);
    await expect(a.page.locator("[data-caption-id]")).toHaveCount(1);
    await expect(a.page.locator("[data-caption-id]")).toContainText("Caption Bob");
    await sendFixture(a.page, '<img src=x onerror="alert(1)">');
    await expect(b.page.locator("[data-caption-id]")).toHaveCount(2);
    await expect(b.page.locator("[data-caption-id] img")).toHaveCount(0);
    const late = await participant(browser, "Caption Late", invite); contexts.push(late.context); await join(late.page);
    await expect(late.page.locator("[data-caption-id]")).toHaveCount(0);
    await b.page.reload(); await join(b.page); await expect(b.page.locator("[data-caption-id]")).toHaveCount(0);
    await sendFixture(a.page, "গ");
    await expect(b.page.locator("[data-caption-id]")).toHaveCount(1);
    await expect(late.page.locator("[data-caption-id]")).toHaveCount(1);
    await b.page.getByRole("button", { name: "Leave meeting", exact: true }).click();
    await expect(a.page.locator("article[data-participant]")).toHaveCount(2);
    await expect(a.page.getByRole("button", { name: "Turn camera off", exact: true })).toBeEnabled();
  } finally { for (const context of contexts) await context.close(); }
});

test("real model and MediaPipe load once, reuse the meeting camera and pause/stop safely", async ({ browser }) => {
  test.setTimeout(150000);
  const a = await participant(browser, "Recognition Lifecycle");
  let observer: Awaited<ReturnType<typeof participant>> | undefined;
  const counts = new Map<string, number>();
  a.page.on("request", request => { const path = new URL(request.url()).pathname; if (path.startsWith("/model/")) counts.set(path, (counts.get(path) ?? 0) + 1); });
  try {
    await a.page.getByRole("button", { name: "Create meeting", exact: true }).click(); await join(a.page, true);
    observer = await participant(browser, "Recognition Observer", a.page.url()); await join(observer.page, true);
    const mediaBefore = await Promise.all([receivedCounters(a.page), receivedCounters(observer.page)]);
    const captures = await a.page.evaluate(() => (window as unknown as InstrumentedWindow).cameraRequests);
    await a.page.getByRole("button", { name: "Start sign recognition", exact: true }).click();
    await expect(a.page.locator("[data-recognition-phase]")).toHaveAttribute("data-recognition-phase", /^(no-hand|unknown|recognizing)$/, { timeout: 90000 });
    await a.page.getByLabel("Show local recognition diagnostics").check();
    // A fixed observation interval is intentional here: sample ongoing tracking, not startup.
    await a.page.waitForTimeout(3000);
    const diagnostics = a.page.getByRole("definition");
    console.info("Development browser observation (synthetic camera, no real sign):", await diagnostics.allTextContents());
    for (const [index, page] of [a.page, observer.page].entries()) {
      await expect.poll(async () => (await receivedCounters(page)).audioBytes).toBeGreaterThan(mediaBefore[index].audioBytes);
      await expect.poll(async () => (await receivedCounters(page)).videoFrames).toBeGreaterThan(mediaBefore[index].videoFrames);
      await expect.poll(() => page.locator('article[data-local="false"] video').evaluateAll(elements => elements.some(element => element instanceof HTMLVideoElement && element.videoWidth > 0 && element.readyState >= 2))).toBe(true);
      await expect.poll(() => page.evaluate(async () => {
        for (const peer of (window as unknown as InstrumentedWindow).captionPeers) {
          if (peer.connectionState === "closed") continue;
          for (const report of (await peer.getStats()).values()) if (report.type === "inbound-rtp" && report.kind === "audio" && report.totalAudioEnergy > 0 && report.bytesReceived > 0) return true;
        }
        return false;
      })).toBe(true);
      await expect.poll(() => page.locator("audio").evaluateAll(elements => elements.some(element => element instanceof HTMLAudioElement && !element.paused && !element.muted && element.readyState >= 2))).toBe(true);
    }
    await expect(a.page.getByRole("button", { name: "Send caption", exact: true })).toBeDisabled();
    await expect(a.page.locator("[data-caption-id]")).toHaveCount(0);
    expect(await a.page.evaluate(() => (window as unknown as InstrumentedWindow).cameraRequests)).toBe(captures);
    await a.page.getByRole("button", { name: "Turn camera off", exact: true }).click();
    await expect(a.page.locator("[data-recognition-phase]")).toHaveAttribute("data-recognition-phase", "paused");
    await a.page.getByRole("button", { name: "Turn camera on", exact: true }).click();
    await expect(a.page.locator("[data-recognition-phase]")).toHaveAttribute("data-recognition-phase", /^(no-hand|unknown|recognizing)$/, { timeout: 15000 });
    await a.page.getByRole("button", { name: "Stop sign recognition", exact: true }).click();
    await expect(a.page.locator("[data-recognition-phase]")).toHaveAttribute("data-recognition-phase", "stopped");
    await expect(a.page.getByRole("button", { name: "Turn camera off", exact: true })).toBeEnabled();
    await a.page.getByRole("button", { name: "Start sign recognition", exact: true }).click();
    await expect(a.page.locator("[data-recognition-phase]")).toHaveAttribute("data-recognition-phase", /^(no-hand|unknown|recognizing)$/, { timeout: 15000 });
    expect(counts.get("/model/model.json")).toBe(1); expect(counts.get("/model/group1-shard1of1.bin")).toBe(1); expect(counts.get("/model/labels.json")).toBe(1);
    await a.page.getByRole("button", { name: "Leave meeting", exact: true }).click(); await expect(a.page).toHaveURL(/\/dashboard$/);
  } finally { await observer?.context.close(); await a.context.close(); }
});

test("missing model asset reports a useful error without stopping the meeting camera", async ({ browser }) => {
  test.setTimeout(120000);
  const a = await participant(browser, "Missing Model");
  try {
    await a.page.route("**/model/model.json", route => route.fulfill({ status: 404, body: "Missing test asset" }));
    await a.page.getByRole("button", { name: "Create meeting", exact: true }).click(); await join(a.page);
    await a.page.getByRole("button", { name: "Start sign recognition", exact: true }).click();
    await expect(a.page.locator("[data-recognition-phase]")).toHaveAttribute("data-recognition-phase", "asset-missing", { timeout: 90000 });
    await expect(a.page.getByRole("button", { name: "Turn camera off", exact: true })).toBeEnabled();
    await expect(a.page.getByRole("button", { name: "Send caption", exact: true })).toBeDisabled();
    await a.page.getByRole("button", { name: "Stop sign recognition", exact: true }).click();
    await expect(a.page.locator("[data-recognition-phase]")).toHaveAttribute("data-recognition-phase", "stopped");
  } finally { await a.context.close(); }
});
