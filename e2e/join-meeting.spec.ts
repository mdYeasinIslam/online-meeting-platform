import { test, expect, type Page } from "@playwright/test";

type MediaWindow = Window & { joinMediaRequests: number };
const password = "temporary browser password 123";
const missingId = "524ad042-e10d-4edc-93c0-62d1f32ce54f";
async function register(page: Page, name: string) {
  const email = `join-${name}-${Date.now()}@example.com`;
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Create an account", exact: true }).click();
  await page.getByLabel("Display name").fill(name);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Register", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return email;
}
async function openJoin(page: Page) {
  await page.getByRole("button", { name: "Join meeting", exact: true }).click();
  const panel = page.getByRole("region", { name: "Join a meeting", exact: true });
  await expect(panel.getByLabel("Meeting link or ID")).toBeFocused();
  return panel;
}
async function createMeeting(page: Page) {
  await page.getByLabel("Meeting title (optional)").fill("Dashboard invitation test");
  await page.getByRole("button", { name: "Create meeting", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ready to join?" })).toBeVisible();
  return page.url();
}
async function connect(page: Page) {
  await page.getByLabel("Microphone on when joining").uncheck();
  await page.getByLabel("Camera on when joining").uncheck();
  await page.getByRole("button", { name: "Join meeting", exact: true }).click();
  await expect(page.getByText("Connected", { exact: true })).toBeVisible({ timeout: 30000 });
}

test("host copies invitation; signed-in guest joins from full URL and raw ID on the current origin", async ({ page, context, browser }) => {
  test.setTimeout(90000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await register(page, "host");
  const invite = await createMeeting(page);
  await page.getByRole("button", { name: "Copy invite link" }).click();
  await expect(page.getByText("Invite link copied.")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(invite);
  if (process.env.DAY2_LIVEKIT === "1") await connect(page);
  const guestContext = await browser.newContext({ baseURL: "http://localhost:3000" });
  try {
    const guest = await guestContext.newPage();
    const email = await register(guest, "guest");
    await guest.getByRole("button", { name: "Sign out", exact: true }).click();
    await guest.getByLabel("Email", { exact: true }).fill(email);
    await guest.getByLabel("Password", { exact: true }).fill(password);
    await guest.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(guest).toHaveURL(/\/dashboard$/);
    let tokenRequests = 0;
    guest.on("request", request => { if (request.url().endsWith("/token")) tokenRequests++; });
    await guest.evaluate(() => {
      const state = window as unknown as MediaWindow;
      state.joinMediaRequests = 0;
      navigator.mediaDevices.getUserMedia = () => { state.joinMediaRequests++; throw new Error("Dashboard/pre-join must not request media"); };
    });
    const roomId = new URL(invite).pathname.split("/").at(-1)!;
    for (const value of [invite, roomId, `https://external.example/meeting/${roomId}?invite=true#join`]) {
      const panel = await openJoin(guest);
      await panel.getByLabel("Meeting link or ID").fill(value);
      const before = tokenRequests;
      await panel.getByLabel("Meeting link or ID").press("Enter");
      await expect(guest).toHaveURL(invite);
      await expect(guest.getByRole("heading", { name: "Ready to join?" })).toBeVisible();
      expect(tokenRequests).toBe(before);
      expect(await guest.evaluate(() => (window as unknown as MediaWindow).joinMediaRequests)).toBe(0);
      if (process.env.DAY2_LIVEKIT === "1") {
        await connect(guest);
        await expect(guest.locator("article[data-participant]")).toHaveCount(2);
        await expect(page.locator("article[data-participant]")).toHaveCount(2);
      }
      await guest.getByRole("button", { name: "Leave meeting", exact: true }).click();
      await expect(guest).toHaveURL(/\/dashboard$/);
      await expect(guest.getByRole("link", { name: "Dashboard invitation test" })).toHaveCount(0);
    }
  } finally { await guestContext.close(); }
});

test("accessible panel rejects invalid input, checks unknown IDs, and closes on Escape on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await register(page, "validation");
  const panel = await openJoin(page);
  const input = panel.getByLabel("Meeting link or ID");
  let lookups = 0;
  page.on("request", request => { if (/\/api\/meetings\//.test(request.url())) lookups++; });
  await input.press("Enter");
  await expect(panel.getByRole("alert")).toHaveText("Enter a meeting link or ID.");
  for (const value of ["abc123", "javascript:alert(1)", "https://evil.example/dashboard", `/meeting/${missingId}/extra`]) {
    await input.fill(value);
    await input.press("Enter");
    await expect(panel.getByRole("alert")).toContainText("valid meeting link or ID");
    await expect(page).toHaveURL(/\/dashboard$/);
  }
  expect(lookups).toBe(0);
  await input.fill(`https://external.example/meeting/${missingId}?long=${"x".repeat(1500)}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await input.press("Enter");
  await expect(panel.getByRole("alert")).toContainText("Meeting not found");
  expect(lookups).toBe(1);
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await input.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Join meeting", exact: true })).toBeFocused();
});

test("ended, unavailable and unexpected responses show safe inline errors", async ({ page }) => {
  await register(page, "errors");
  const panel = await openJoin(page);
  const endpoint = `**/api/meetings/${missingId}`;
  // Deliberate API fault injection in tests only; application uses real Express.
  for (const [status, message] of [[410, "meeting has ended"], [503, "Cannot reach"], [403, "Unable to check"]] as const) {
    await page.route(endpoint, route => route.fulfill({ status, json: { error: "PRIVATE DATABASE ERROR" } }));
    await panel.getByLabel("Meeting link or ID").fill(missingId);
    await panel.getByLabel("Meeting link or ID").press("Enter");
    await expect(panel.getByRole("alert")).toContainText(message);
    await expect(panel).not.toContainText("PRIVATE DATABASE ERROR");
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.unroute(endpoint);
  }
  await page.route(endpoint, route => route.abort("failed"));
  await panel.getByLabel("Meeting link or ID").press("Enter");
  await expect(panel.getByRole("alert")).toContainText("Cannot reach");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("pending lookup blocks duplicate submissions; cancellation prevents late navigation", async ({ page }) => {
  await register(page, "pending");
  const invite = await createMeeting(page);
  await page.getByRole("button", { name: "Leave meeting", exact: true }).click();
  const panel = await openJoin(page);
  const input = panel.getByLabel("Meeting link or ID");
  const endpoint = `**/api/meetings/${new URL(invite).pathname.split("/").at(-1)}`;
  let requests = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(endpoint, async route => { requests++; await gate; await route.continue(); });
  await input.fill(invite);
  await input.press("Enter");
  await expect(panel.getByRole("button", { name: "Checking meeting…" })).toBeDisabled();
  await input.press("Enter");
  await input.press("Enter");
  await expect.poll(() => requests).toBe(1);
  await panel.getByRole("button", { name: "Cancel" }).click();
  release();
  await expect(panel).toHaveCount(0);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.unroute(endpoint);
  const reopened = await openJoin(page);
  await reopened.getByLabel("Meeting link or ID").press("Enter");
  await expect(page).toHaveURL(invite);
});

test("expired real session offers sign-in and restores the intended meeting", async ({ page, context }) => {
  const email = await register(page, "expired");
  const invite = await createMeeting(page);
  await page.getByRole("button", { name: "Leave meeting", exact: true }).click();
  const panel = await openJoin(page);
  await context.clearCookies();
  await panel.getByLabel("Meeting link or ID").fill(invite);
  await panel.getByLabel("Meeting link or ID").press("Enter");
  await expect(panel.getByRole("alert")).toContainText("session has expired");
  await panel.getByRole("link", { name: "Sign in to join this meeting" }).click();
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("next")).toBe(new URL(invite).pathname);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(invite);
  await expect(page.getByRole("heading", { name: "Ready to join?" })).toBeVisible();
});
