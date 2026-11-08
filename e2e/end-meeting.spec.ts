import { test, expect, type Browser, type Page } from "@playwright/test";
test.skip(process.env.DAY2_LIVEKIT !== "1", "Requires the configured LiveKit service and isolated test MongoDB.");
type Observed = Window & { captured: MediaStreamTrack[]; captures: number };
async function user(browser: Browser, name: string) {
  const context = await browser.newContext({ baseURL: "http://localhost:3000", permissions: ["camera", "microphone"] });
  await context.addInitScript(() => {
    const state = window as unknown as Observed; state.captured = []; state.captures = 0;
    const capture = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => { state.captures++; const stream = await capture(constraints); state.captured.push(...stream.getTracks()); return stream; };
  });
  const page = await context.newPage(); await page.goto("/dashboard");
  await page.getByRole("button", { name: "Create an account", exact: true }).click();
  await page.getByLabel("Display name").fill(name);
  await page.getByLabel("Email", { exact: true }).fill(`end-${name}-${Date.now()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("temporary browser password 123");
  await page.getByRole("button", { name: "Register", exact: true }).click(); await expect(page).toHaveURL(/\/dashboard$/);
  return { context, page };
}
async function create(page: Page, title = "End meeting test") {
  await page.getByLabel("Meeting title (optional)").fill(title);
  await page.getByRole("button", { name: "Create meeting", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ready to join?" })).toBeVisible(); return page.url();
}
async function join(page: Page) {
  await page.getByRole("button", { name: "Join meeting", exact: true }).click();
  await expect(page.getByText("Connected", { exact: true })).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole("button", { name: "Turn camera off", exact: true })).toBeEnabled({ timeout: 20000 });
}
async function ended(page: Page) {
  await expect(page.getByRole("heading", { name: "This meeting has ended", exact: true })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole("heading", { name: "Ready to join?" })).toHaveCount(0);
  await expect(page.locator("article[data-participant]")).toHaveCount(0);
  await expect(page.locator("[data-recognition-phase]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Send caption", exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as unknown as Observed).captured.every(track => track.readyState === "ended"))).toBe(true);
}
async function post(page: Page, path: string) {
  return page.evaluate(async ({ path, port }) => {
    const base = `http://localhost:${port}/api`;
    const csrf = await fetch(`${base}/auth/csrf`, { credentials: "include" }).then(r => r.json());
    const response = await fetch(`${base}${path}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf.csrfToken }, body: "{}" });
    return { status: response.status, body: await response.json() };
  }, { path, port: process.env.E2E_API_PORT || "5000" });
}
test("real host shutdown disconnects both users; old links never capture media or request another token", async ({ browser }) => {
  test.setTimeout(120000);
  const host = await user(browser, "host"), guest = await user(browser, "guest");
  try {
    const invite = await create(host.page), roomId = new URL(invite).pathname.split("/").at(-1)!;
    await guest.page.goto(invite);
    await expect(guest.page.getByRole("button", { name: "End meeting for everyone", exact: true })).toHaveCount(0);
    await join(host.page); await join(guest.page);
    await expect(host.page.locator("article[data-participant]")).toHaveCount(2);
    expect((await post(guest.page, `/meetings/${roomId}/end`)).status).toBe(403);
    await expect(host.page.locator("article[data-participant]")).toHaveCount(2);
    await guest.page.getByRole("button", { name: "Start sign recognition", exact: true }).click();
    await expect(guest.page.locator("[data-recognition-phase]")).toHaveAttribute("data-recognition-phase", /^(no-hand|unknown|recognizing)$/, { timeout: 90000 });
    let endRequests = 0, tokens = 0;
    host.page.on("request", r => { if (r.url().endsWith("/end")) endRequests++; if (r.url().endsWith("/token")) tokens++; });
    guest.page.on("request", r => { if (r.url().endsWith("/token")) tokens++; });
    const trigger = host.page.getByRole("button", { name: "End meeting for everyone", exact: true });
    await trigger.click(); const dialog = host.page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
    await host.page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
    await trigger.click(); await dialog.getByRole("button", { name: "Cancel", exact: true }).click(); expect(endRequests).toBe(0);
    await trigger.click(); await dialog.getByRole("button", { name: "End meeting", exact: true }).click();
    if (process.env.DAY42_TESTING === "1") {
      await expect(dialog.getByRole("button", { name: "Ending…", exact: true })).toBeDisabled();
      await host.page.keyboard.press("Escape"); await expect(dialog).toBeVisible();
    }
    await ended(host.page); await ended(guest.page); expect(endRequests).toBe(1);
    // Give the SDK time to expose an accidental automatic reconnect/token retry.
    await expect.poll(async () => { await guest.page.waitForTimeout(1200); return tokens; }).toBe(0);
    await guest.page.getByRole("link", { name: "Return to dashboard" }).click();
    for (const value of [roomId, `/meeting/${roomId}`, invite]) {
      await guest.page.getByRole("button", { name: "Join meeting", exact: true }).click();
      const panel = guest.page.getByRole("region", { name: "Join a meeting", exact: true });
      await panel.getByLabel("Meeting link or ID").fill(value); await panel.getByLabel("Meeting link or ID").press("Enter");
      await expect(panel.getByRole("alert")).toContainText("This meeting has ended."); await expect(guest.page).toHaveURL(/\/dashboard$/);
      await panel.getByRole("button", { name: "Cancel", exact: true }).click();
    }
    await guest.page.goto(invite); await ended(guest.page);
    expect(await guest.page.evaluate(() => (window as unknown as Observed).captures)).toBe(0); expect(tokens).toBe(0);
    expect((await post(guest.page, `/meetings/${roomId}/token`)).status).toBe(410);
    await host.page.getByRole("link", { name: "Return to dashboard" }).click(); expect(await create(host.page)).not.toBe(invite);
  } finally { await host.context.close(); await guest.context.close(); }
});
test("ordinary guest and host Leave keep the other participant and invitation active", async ({ browser }) => {
  test.setTimeout(120000);
  const host = await user(browser, "leavehost"), guest = await user(browser, "leaveguest");
  try {
    const invite = await create(host.page); await guest.page.goto(invite); await join(host.page); await join(guest.page);
    await guest.page.getByRole("button", { name: "Leave meeting", exact: true }).click(); await expect(guest.page).toHaveURL(/\/dashboard$/);
    await expect(host.page.locator("article[data-participant]")).toHaveCount(1);
    await guest.page.goto(invite); await join(guest.page);
    await host.page.getByRole("button", { name: "Leave meeting", exact: true }).click(); await expect(host.page).toHaveURL(/\/dashboard$/);
    await expect(guest.page.getByText("Connected", { exact: true })).toBeVisible(); await expect(guest.page.locator("article[data-participant]")).toHaveCount(1);
    await host.page.goto(invite); await expect(host.page.getByRole("heading", { name: "Ready to join?" })).toBeVisible();
  } finally { await host.context.close(); await guest.context.close(); }
});
test("external deletion failure stays non-joinable; host can reload and retry shutdown", async ({ browser }) => {
  test.skip(process.env.DAY42_TESTING !== "1", "Requires the isolated external-provider fault injector."); test.setTimeout(90000);
  const host = await user(browser, "retryhost"), guest = await user(browser, "retryguest");
  try {
    const invite = await create(host.page, "Retry deletion test"); await guest.page.goto(invite); await join(host.page); await join(guest.page);
    await host.page.getByRole("button", { name: "End meeting for everyone", exact: true }).click();
    const dialog = host.page.getByRole("dialog"); await dialog.getByRole("button", { name: "End meeting", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("participants may still be connected");
    await expect(dialog).toBeVisible(); await expect(guest.page.getByText("Connected", { exact: true })).toBeVisible();
    const roomId = new URL(invite).pathname.split("/").at(-1)!;
    expect((await post(guest.page, `/meetings/${roomId}/token`)).status).toBe(410);
    await host.page.reload(); await expect(host.page.getByRole("heading", { name: "This meeting is ending", exact: true })).toBeVisible();
    await host.page.getByRole("button", { name: "End meeting for everyone", exact: true }).click();
    await host.page.getByRole("dialog").getByRole("button", { name: "End meeting", exact: true }).click(); await ended(host.page); await ended(guest.page);
  } finally { await host.context.close(); await guest.context.close(); }
});

test("an already open pre-join screen rejects a now-ended meeting before device capture", async ({ browser }) => {
  const host = await user(browser, "prejoinhost"), guest = await user(browser, "prejoinguest");
  try {
    const invite = await create(host.page); await guest.page.goto(invite);
    await expect(guest.page.getByRole("heading", { name: "Ready to join?" })).toBeVisible();
    const roomId = new URL(invite).pathname.split("/").at(-1)!;
    expect((await post(host.page, `/meetings/${roomId}/end`)).status).toBe(200);
    await guest.page.getByRole("button", { name: "Join meeting", exact: true }).click(); await ended(guest.page);
    expect(await guest.page.evaluate(() => (window as unknown as Observed).captures)).toBe(0);
  } finally { await host.context.close(); await guest.context.close(); }
});
