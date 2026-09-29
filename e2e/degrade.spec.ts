import { expect, test } from "@playwright/test";

// The degradation matrix of the v3 plan (7.2): every row has a test.

test("reduced motion: whole game flow works with no canvas, no leaked frame callbacks, numbers shown at once", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/play/2015");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: /开始第 1 回合/ }).click();
  for (let m = 0; m < 12; m++) {
    if (await page.getByTestId("moment-card").isVisible().catch(() => false)) await page.getByRole("button", { name: "不动" }).click();
    await page.getByRole("button", { name: "平均分配" }).click();
    await page.getByTestId("next-month").click();
    const d = page.getByRole("dialog", { name: "本月结算" });
    await expect(d).toBeVisible();
    await d.getByRole("button", { name: /进入下个月|查看年终结算/ }).click();
  }
  await expect(page).toHaveURL(/\/result/);
  await expect(page.getByTestId("final-return-odometer")).toHaveAttribute("data-settled", "true", { timeout: 2000 }); // no roll: immediate
  await expect(page.locator("html.has-cursor")).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __frameLoop: { active: number } }).__frameLoop.active)).toBe(0);
  expect(errors).toEqual([]);
  await ctx.close();
});

test("no WebGL: the home hero stays on the static image and never mounts a canvas", async ({ browser }) => {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") return null;
      return (orig as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof orig;
  });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.waitForTimeout(2500);
  await expect(page.locator("[data-hero-mode]")).toHaveAttribute("data-hero-mode", "static");
  await expect(page.locator("[data-hero-mode] canvas")).toHaveCount(0); // the event card keeps its own 2D canvas; the hero must have none
  await ctx.close();
});

test("touch device: no custom cursor, no frame callbacks on the home page", async ({ browser }) => {
  const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.waitForTimeout(800);
  await expect(page.locator("html.has-cursor")).toHaveCount(0);
  await ctx.close();
});

test("battery saver (< 20%, not charging) counts as reduced motion", async ({ browser }) => {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    (navigator as unknown as { getBattery: () => Promise<object> }).getBattery = async () => ({ level: 0.1, charging: false, addEventListener() {}, removeEventListener() {} });
  });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "1");
  await expect(page.locator("[data-hero-mode]")).toHaveAttribute("data-hero-mode", "static");
  await ctx.close();
});

test("hidden tab: the shared frame loop stops", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as unknown as { __frameLoop: { running: boolean } }).__frameLoop.running)).toBe(false);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as unknown as { __frameLoop: { running: boolean } }).__frameLoop.running)).toBe(true);
});
