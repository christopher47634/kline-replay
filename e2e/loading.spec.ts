import { expect, test } from "@playwright/test";

// 加载稳定性：网络抖动或刚发布新版本时，懒加载的脚本块可能失败（2026-10-16）。

test("a chunk that fails once is retried: the board still loads", async ({ page }) => {
  await page.goto("/play/2015");
  await page.evaluate(() => localStorage.setItem("kline:sound-asked", "1"));
  const failed = new Set<string>();
  await page.route(/\/_next\/static\/chunks\/.*\.js/, (r) => {
    const u = r.request().url();
    if (!failed.has(u)) {
      failed.add(u);
      return r.abort();
    }
    return r.continue();
  });
  await page.getByRole("button", { name: /开始第 1 回合/ }).click();
  await expect(page.getByTestId("workbench").or(page.getByTestId("more-data"))).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("region", { name: "走势" })).toBeVisible();
});

test("a chunk that never loads: friendly screen, not Application error", async ({ page }) => {
  await page.goto("/play/2015");
  await page.evaluate(() => {
    localStorage.setItem("kline:sound-asked", "1");
    sessionStorage.setItem("kline:chunk-reload", String(Date.now())); // the one auto-reload already used
  });
  await page.route(/\/_next\/static\/chunks\/.*\.js/, (r) => r.abort());
  await page.getByRole("button", { name: /开始第 1 回合/ }).click();
  await page.waitForTimeout(9000);
  const body = await page.locator("body").innerText();
  await expect(page.getByTestId("error-screen")).toBeVisible();
  expect(body).not.toContain("Application error");
});

test("titles never stay hidden when the animation library cannot load", async ({ page }) => {
  await page.route(/gsap|SplitText/i, (r) => r.abort());
  await page.route(/\/_next\/static\/chunks\/(?!webpack|main|framework|app\/|pages\/|polyfills|[0-9a-f]{8}-)[^/]*\.js/, async (r) => {
    // only lazy chunks that bundle gsap get blocked: detect by content
    const res = await r.fetch();
    const body = await res.text();
    if (/SplitText|gsap\.registerPlugin|GreenSock/.test(body)) return r.abort();
    return r.fulfill({ response: res, body });
  });
  await page.goto("/");
  await page.waitForTimeout(2500);
  const vis = await page.locator("h1").first().evaluate((el) => getComputedStyle(el).visibility);
  expect(vis).toBe("visible");
});

test("home button: on every page but home, top right, goes home", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("home-button")).toHaveCount(0);
  for (const p of ["/play/2015", "/events", "/about"]) {
    await page.goto(p);
    await expect(page.getByTestId("home-button")).toBeVisible();
  }
  await page.getByTestId("home-button").click();
  await expect(page).toHaveURL(/\/$/);
});
