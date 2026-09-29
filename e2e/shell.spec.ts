import { expect, test } from "@playwright/test";

const frameLoopActive = (page: import("@playwright/test").Page) =>
  page.evaluate(() => (window as unknown as { __frameLoop?: { active: number } }).__frameLoop?.active ?? 0);

test("switching routes five times leaves no leaked animation-frame callbacks (reduced motion: zero)", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (let i = 0; i < 5; i++) {
    for (const path of ["/", "/events", "/about", "/play/2015"]) await page.goto(path);
  }
  await page.waitForTimeout(300);
  expect(await frameLoopActive(page)).toBe(0);
  expect(errors).toEqual([]);
  await ctx.close();
});

test("normal motion: only the desktop cursor keeps a frame callback; it is released on touch devices", async ({ browser }) => {
  const desktop = await browser.newContext();
  const p1 = await desktop.newPage();
  for (const path of ["/", "/events", "/about", "/", "/events"]) await p1.goto(path);
  await p1.waitForTimeout(300);
  expect(await frameLoopActive(p1)).toBeLessThanOrEqual(1);
  await desktop.close();

  const phone = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const p2 = await phone.newPage();
  for (const path of ["/", "/events", "/about"]) await p2.goto(path);
  await p2.waitForTimeout(300);
  expect(await frameLoopActive(p2)).toBe(0);
  await phone.close();
});

test("reduced motion renders no canvas on the home page and skips the custom cursor", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator("html.has-cursor")).toHaveCount(0);
  await ctx.close();
});

test("a modal dialog gets the native cursor back (the custom cursor sits below the top layer)", async ({ page }) => {
  await page.goto("/play/2015");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: /开始第 1 回合/ }).click();
  await expect(page.locator("html.has-cursor")).toHaveCount(1);
  await page.getByRole("button", { name: "平均分配" }).click();
  await page.getByTestId("next-month").click();
  const dialog = page.getByRole("dialog", { name: "本月结算" });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((el) => getComputedStyle(el).cursor)).toBe("auto");
  expect(await dialog.getByRole("button", { name: /进入下个月/ }).evaluate((el) => getComputedStyle(el).cursor)).toBe("pointer");
});
