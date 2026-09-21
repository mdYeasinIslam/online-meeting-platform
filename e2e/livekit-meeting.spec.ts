import { test, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

// Opt-in: actual configured LiveKit, isolated MongoDB, synthetic browser devices.
// No tokens, cookies or environment values are recorded in test output.
test.skip(process.env.DAY2_LIVEKIT !== "1", "Set DAY2_LIVEKIT=1 to test the configured LiveKit service.");
type TestWindow = Window & { testPeers: RTCPeerConnection[]; testTracks: MediaStreamTrack[]; testDeviceCalls: number };

async function user(browser: Browser, name: string, roomUrl?: string, failedDevice?: "video" | "audio") {
  const context = await browser.newContext({ baseURL: "http://localhost:3000", permissions: ["camera", "microphone"] });
  await context.addInitScript(({ failedDevice }) => {
    const state = window as unknown as TestWindow;
    state.testPeers = []; state.testTracks = []; state.testDeviceCalls = 0;
    const Original = window.RTCPeerConnection;
    window.RTCPeerConnection = class extends Original {
      constructor(configuration?: RTCConfiguration) { super(configuration); state.testPeers.push(this); }
    };
    const capture = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => {
      state.testDeviceCalls++;
      if (failedDevice && constraints?.[failedDevice]) throw new DOMException("Test device permission denied", "NotAllowedError");
      const stream = await capture(constraints);
      state.testTracks.push(...stream.getTracks());
      return stream;
    };
  }, { failedDevice });
  const page = await context.newPage();
  await page.goto(roomUrl || "/dashboard");
  await page.getByRole("button", { name: "Create an account", exact: true }).click();
  await page.getByLabel("Display name").fill(name);
  await page.getByLabel("Email", { exact: true }).fill(`${name.toLowerCase().replaceAll(" ", "-")}-${Date.now()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("temporary browser password 123");
  await page.getByRole("button", { name: "Register", exact: true }).click();
  await expect(page).toHaveURL(roomUrl || /\/dashboard$/);
  return { context, page };
}
async function join(page: Page, microphone = true, camera = true) {
  await page.getByLabel("Microphone on when joining").setChecked(microphone);
  await page.getByLabel("Camera on when joining").setChecked(camera);
  await page.getByRole("button", { name: "Join meeting", exact: true }).click();
  await expect(page.getByText("Connected", { exact: true })).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole("button", { name: /^(Mute|Unmute) microphone$/ })).toBeEnabled({ timeout: 20000 });
}
async function remoteVideo(page: Page) {
  await expect.poll(() => page.locator('article[data-local="false"] video').evaluateAll(elements =>
    elements.some(element => element instanceof HTMLVideoElement && element.videoWidth > 0 && element.readyState >= 2)), { timeout: 30000 }).toBe(true);
}
async function receivedAudio(page: Page) {
  await expect.poll(() => page.evaluate(async () => {
    const peers = (window as unknown as TestWindow).testPeers;
    for (const peer of peers) {
      if (peer.connectionState === "closed") continue;
      const stats = await peer.getStats();
      for (const report of stats.values()) {
        if (report.type === "inbound-rtp" && report.kind === "audio" && report.bytesReceived > 0 && report.totalAudioEnergy > 0) return true;
      }
    }
    return false;
  }), { timeout: 30000 }).toBe(true);
  await expect.poll(() => page.locator("audio").evaluateAll(elements => elements.some(element => element instanceof HTMLAudioElement && !element.paused && !element.muted && element.readyState >= 2))).toBe(true);
}

test("real two-user media, mute, camera, leave, rejoin, refresh, seven-person capacity and duplicate identity", async ({ browser }) => {
  test.setTimeout(240000);
  const contexts: BrowserContext[] = [];
  try {
    const host = await user(browser, "Day2 Host"); contexts.push(host.context);
    await host.page.getByLabel("Meeting title (optional)").fill("Day2 media verification");
    await host.page.getByRole("button", { name: "Create meeting", exact: true }).click();
    await expect(host.page.getByRole("heading", { name: "Day2 media verification" })).toBeVisible();
    const url = host.page.url();
    expect(await host.page.evaluate(() => (window as unknown as TestWindow).testDeviceCalls)).toBe(0);
    await join(host.page);
    const guest = await user(browser, "Day2 Guest", url); contexts.push(guest.context);
    await join(guest.page);
    for (const page of [host.page, guest.page]) {
      await expect(page.locator("article[data-participant]")).toHaveCount(2);
      await expect(page.getByRole("article", { name: /Day2 Host/ }).getByText("Host", { exact: true })).toBeVisible();
      await remoteVideo(page); await receivedAudio(page);
    }
    await host.page.getByRole("button", { name: "Mute microphone", exact: true }).click();
    for (const page of [host.page, guest.page]) await expect(page.getByRole("article", { name: /Day2 Host/ }).getByText("Microphone muted")).toBeVisible();
    await guest.page.getByRole("button", { name: "Turn camera off", exact: true }).click();
    for (const page of [host.page, guest.page]) await expect(page.getByRole("article", { name: /Day2 Guest/ }).getByText("Camera off")).toBeVisible();
    await guest.page.getByRole("button", { name: "Turn camera on", exact: true }).click();
    await remoteVideo(host.page);
    await guest.page.getByRole("button", { name: "Leave meeting", exact: true }).click();
    await expect(guest.page).toHaveURL(/\/dashboard$/);
    expect(await guest.page.evaluate(() => (window as unknown as TestWindow).testTracks.every(track => track.readyState === "ended"))).toBe(true);
    await expect(host.page.locator("article[data-participant]")).toHaveCount(1);
    await guest.page.goto(url); await join(guest.page, false, true);
    await expect(host.page.locator("article[data-participant]")).toHaveCount(2);
    await guest.page.reload();
    await expect(guest.page.getByRole("button", { name: "Join meeting", exact: true })).toBeVisible();
    await expect(host.page.locator("article[data-participant]")).toHaveCount(1);
    expect(await guest.page.evaluate(() => (window as unknown as TestWindow).testDeviceCalls)).toBe(0);
    await join(guest.page, false, false);
    for (let i = 3; i <= 7; i++) {
      const additional = await user(browser, `Day2 User ${i}`, url); contexts.push(additional.context);
      await join(additional.page, false, false);
    }
    await expect(host.page.locator("article[data-participant]")).toHaveCount(7);
    const eighth = await user(browser, "Day2 Eighth", url); contexts.push(eighth.context);
    await eighth.page.getByLabel("Microphone on when joining").uncheck();
    await eighth.page.getByLabel("Camera on when joining").uncheck();
    await eighth.page.getByRole("button", { name: "Join meeting", exact: true }).click();
    await expect(eighth.page.locator("section").getByRole("alert")).toContainText("meeting is full", { timeout: 30000 });
    await guest.page.getByRole("button", { name: "Leave meeting", exact: true }).click();
    await expect(host.page.locator("article[data-participant]")).toHaveCount(6);
    await join(eighth.page, false, false);
    await expect(host.page.locator("article[data-participant]")).toHaveCount(7);
    const duplicate = await host.context.newPage(); await duplicate.goto(url);
    await join(duplicate, false, false);
    await expect(host.page.locator("section").getByRole("alert")).toContainText("another tab or device");
    expect(await host.page.evaluate(() => (window as unknown as TestWindow).testTracks.every(track => track.readyState === "ended"))).toBe(true);
  } finally { for (const context of contexts) await context.close(); }
});

for (const failedDevice of ["video", "audio"] as const) {
  test(`${failedDevice} denial permits the other device and releases tracks on navigation`, async ({ browser }) => {
    test.setTimeout(60000);
    const host = await user(browser, `Permission ${failedDevice}`, undefined, failedDevice);
    try {
      await host.page.getByRole("button", { name: "Create meeting", exact: true }).click();
      await join(host.page);
      await expect(host.page.locator("section").getByRole("alert")).toContainText(`${failedDevice === "video" ? "Camera" : "Microphone"} permission was denied`);
      await expect(host.page.getByRole("button", { name: failedDevice === "video" ? "Mute microphone" : "Turn camera off", exact: true })).toBeEnabled();
      await host.page.goBack();
      await expect(host.page).toHaveURL(/\/dashboard$/);
      await expect.poll(() => host.page.evaluate(() => (window as unknown as TestWindow).testTracks.every(track => track.readyState === "ended"))).toBe(true);
    } finally { await host.context.close(); }
  });
}
