import { expect, test, type Page } from "@playwright/test";

const setPrefs = async (page: Page, prefs: object) => {
  await page.goto("/");
  await page.evaluate((p) => {
    localStorage.clear();
    localStorage.setItem("kline:prefs", JSON.stringify(p));
  }, prefs);
};

const startGame = async (page: Page) => {
  await page.goto("/play/2015");
  await page.getByRole("button", { name: /开始第 1 回合/ }).click();
  if (await page.getByTestId("moment-card").isVisible().catch(() => false)) await page.getByRole("button", { name: "不动" }).click();
  await page.getByRole("button", { name: "平均分配" }).click();
};

test("default is the 盘口 skin: pro workbench on the board, research-style settlement", async ({ page }) => {
  await setPrefs(page, {});
  await startGame(page);
  await expect(page.locator("html")).toHaveAttribute("data-skin", "pan");
  await expect(page.getByTestId("workbench")).toBeVisible();
  await page.getByTestId("next-month").click();
  const d = page.getByRole("dialog", { name: "本月结算" });
  await expect(d.getByTestId("voice-pro")).toBeVisible();
  await expect(d.getByText(/跑(输|赢)大盘 \d+\.\d 个百分点/)).toBeVisible();
  await expect(d.getByRole("columnheader", { name: "贡献" })).toBeVisible();
});

test("settings drawer: skin applies at once, font opens a second level, Esc steps back then closes", async ({ page }) => {
  await setPrefs(page, {});
  await page.goto("/");
  const btn = page.getByRole("button", { name: /阅读设置/ });
  await btn.click();
  const drawer = page.getByRole("dialog", { name: "阅读设置" });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("radio", { name: /纸面/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-skin", "paper");
  // the page colour lives on <html> (the canvas), so the fixed dot field can sit between it and the content
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe("rgb(246, 244, 239)");

  await drawer.getByRole("button", { name: /^字体/ }).click();
  const l2 = page.getByRole("dialog", { name: "阅读设置 · 正文字体" });
  await expect(l2).toBeVisible();
  await l2.getByRole("radio", { name: /霞鹜文楷/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-font", "kai");
  await page.waitForFunction(() => document.fonts.check('16px "LXGW WenKai Screen"', "穿越"));
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain("LXGW WenKai Screen");

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "阅读设置" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /阅读设置/ })).toHaveCount(0);
  await expect(btn).toBeFocused();

  // the choice survives a reload and is applied by the <head> script before React runs
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-skin", "paper");
  await expect(page.locator("html")).toHaveAttribute("data-font", "kai");
});

test("简约 skin folds the secondary panels (not removed) and settles in plain words", async ({ page }) => {
  await setPrefs(page, { skin: "plain" });
  await startGame(page);
  // 信息密度「精简」: the same data, folded into 更多数据 instead of hidden
  await expect(page.getByRole("region", { name: "本月已知信息" })).toBeHidden();
  await expect(page.getByTestId("more-data")).toBeVisible();
  await page.getByTestId("next-month").click();
  const d = page.getByRole("dialog", { name: "本月结算" });
  await expect(d.getByTestId("voice-plain")).toBeVisible();
  await expect(d.getByText(/^这个月你(亏|赚)了 \d+\.\d%/)).toBeVisible();
});

test("macro drawer (纸面): six real series, second level shows only months already published", async ({ page }) => {
  await setPrefs(page, { skin: "paper" });
  await startGame(page);
  // the workbench (now on every skin) opens the macro drawer
  await page.getByRole("button", { name: "宏观与资金面：打开明细" }).click();
  const d = page.getByRole("dialog", { name: "宏观与资金面" });
  await expect(d.locator(".dr-row")).toHaveCount(6);
  await d.locator(".dr-row", { hasText: "CPI 同比" }).click();
  const l2 = page.getByRole("dialog", { name: "宏观与资金面 · CPI 同比" });
  await expect(l2).toBeVisible();
  // round 1 = January 2015: December's CPI came out on Jan 9, so the latest visible month is November 2014
  await expect(l2.locator("tbody tr").first()).toContainText("2014 年 11 月");
  await expect(l2.getByText("之后的月份：未来不可见")).toBeVisible();
});

test("liquid glass keeps the fixed buttons fixed; the loupe magnifies a key number", async ({ page }) => {
  await setPrefs(page, {});
  await startGame(page);
  const mute = page.getByRole("button", { name: /静音/ });
  expect(await mute.evaluate((el) => getComputedStyle(el).position)).toBe("fixed");
  // Apple-style: a white specular rim (no rainbow ring) and a per-size lens filter in Chromium
  const rim = await mute.evaluate((el) => getComputedStyle(el, "::before").backgroundImage);
  expect(rim).toContain("linear-gradient");
  expect(rim).not.toContain("conic-gradient");
  await expect.poll(() => mute.evaluate((el) => el.style.getPropertyValue("--lg-filter"))).toMatch(/^url\(#lgf-\d+x\d+r\d+\)$/);
  const status = page.getByTestId("status-compact").or(page.locator(".lg.relative")).first();
  await expect(status).toBeVisible();
  const v = page.getByTestId("workbench").locator("[data-zoom]").first();
  const box = (await v.boundingBox())!;
  await page.mouse.move(box.x - 30, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
  await expect(page.locator(".loupe")).toHaveClass(/is-on/);
  await expect(page.locator(".loupe-label")).toContainText("风险敞口");
  await expect(v).toHaveClass(/zoom-hot/);
  await page.mouse.move(5, 500, { steps: 4 });
  await expect(page.locator(".loupe")).not.toHaveClass(/is-on/);
});

test("font size 130% scales the game board only", async ({ page }) => {
  await setPrefs(page, { scale: 1.3 });
  await startGame(page);
  expect(await page.locator("main[data-zoom-area]").evaluate((el) => getComputedStyle(el).zoom)).toBe("1.3");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("more settings: glass level 2, up/down colours, loupe off, accent, reduced motion", async ({ page }) => {
  await setPrefs(page, {});
  await startGame(page);
  const html = page.locator("html");
  await page.getByRole("button", { name: /阅读设置/ }).click();
  await page.getByRole("button", { name: /玻璃质感/ }).click();
  await expect(page.getByRole("dialog", { name: "阅读设置 · 玻璃质感" })).toBeVisible();
  await page.getByRole("radio", { name: /着色/ }).click();
  await expect(html).toHaveAttribute("data-glass", "tinted");
  await page.getByRole("button", { name: "返回阅读设置" }).click();
  const upBefore = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--color-up").trim());
  await page.getByRole("radio", { name: "绿涨红跌" }).click();
  await expect(html).toHaveAttribute("data-updown", "intl");
  const upAfter = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--color-up").trim());
  expect(upAfter).not.toBe(upBefore);
  await page.getByRole("radiogroup", { name: "数据放大镜" }).getByRole("radio", { name: "关" }).click();
  await expect(html).toHaveAttribute("data-loupe", "off");
  await page.getByRole("radio", { name: /冰川蓝/ }).click();
  await expect(html).toHaveAttribute("data-accent", "ice");
  await page.getByRole("radio", { name: "减少" }).click();
  await expect(html).toHaveAttribute("data-reduce-motion", "1");
  await page.keyboard.press("Escape");
  // loupe off: hovering a key number shows no lens
  const v = page.getByTestId("workbench").locator("[data-zoom]").first();
  const box = (await v.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 });
  await expect(page.locator(".loupe")).not.toHaveClass(/is-on/);
  // after 见微: this month's release calendar, values hidden
  await expect(page.getByTestId("calendar")).toContainText("本月将公布");
});
