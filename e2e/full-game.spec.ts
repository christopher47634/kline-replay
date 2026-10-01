import { expect, test, type Page } from "@playwright/test";

/** What the user actually sees on an odometer once it has settled: each digit column's translateY read back as a digit. */
async function settledOdometerText(page: Page, testId: string) {
  const odo = page.getByTestId(testId);
  await expect(odo).toHaveAttribute("data-settled", "true", { timeout: 15_000 });
  const visible = await odo.evaluate((el) => {
    return Array.from(el.children)
      .map((c) => {
        const inner = c.firstElementChild as HTMLElement | null;
        if (!inner) return c.textContent ?? "";
        const box = (c as HTMLElement).getBoundingClientRect().height;
        const ty = new DOMMatrixReadOnly(getComputedStyle(inner).transform).m42;
        return String(Math.round(-ty / box));
      })
      .join("");
  });
  return { visible, value: (await odo.getAttribute("data-value")) as string };
}

test("plays a full 2015 game, shares it, and plays the music", async ({ page, context }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // 1. home -> start
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("link", { name: "开始穿越" }).click();
  await expect(page).toHaveURL(/\/play\/2015$/);
  await page.getByRole("button", { name: /开始第 1 回合/ }).click();

  // 2. twelve rounds of "平均分配" -> next -> close dialog
  for (let m = 0; m < 12; m++) {
    // historical-moment cards appear before some rounds: take "不动" so the allocation stays even
    if (await page.getByTestId("moment-card").isVisible().catch(() => false)) await page.getByRole("button", { name: "不动" }).click();
    await page.getByRole("button", { name: "平均分配" }).click();
    await page.getByRole("button", { name: /进入下个月|结算最后一个月/ }).first().click();
    const dialog = page.getByRole("dialog", { name: "本月结算" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /进入下个月|查看年终结算/ }).click();
  }

  // 3. result page
  await expect(page).toHaveURL(/\/result\?s=2015\./, { timeout: 15_000 });
  // the rolling digits must settle on exactly the value the page reports (screen-reader text and data-value)
  const odo = await settledOdometerText(page, "final-return-odometer");
  expect(odo.visible).toBe(odo.value);
  const ret = page.getByTestId("final-return");
  await expect(ret).toHaveText(odo.value);
  await expect(ret).toHaveText(/^[+−]?\d+\.\d%$/);
  const retText = await ret.textContent();
  await expect(page.getByTestId("persona-card")).toBeVisible();
  await expect(page.getByTestId("block")).toHaveCount(12);

  // 4. copy link -> open in a fresh page -> same number
  await page.getByRole("button", { name: "复制链接" }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain("/result?s=2015.");
  const other = await context.newPage();
  await other.goto(link);
  await expect(other.getByTestId("final-return")).toHaveText(retText!);
  await other.close();

  // 5. music: canvas appears, progress advances after play
  await page.getByRole("button", { name: /听听你的 2015/ }).click();
  const modal = page.getByRole("dialog", { name: "听听你的 2015" });
  await expect(modal.locator("canvas")).toBeVisible();
  await modal.getByRole("button", { name: "播放" }).click();
  await page.waitForTimeout(2000);
  const progress = await page.evaluate(() => (window as unknown as { __klineMusic?: { position: number } }).__klineMusic?.position ?? 0);
  expect(progress).toBeGreaterThan(0);
  expect(errors).toEqual([]);

  // 6. shared music link opens the modal with a big play button and no autoplay
  const shared = await context.newPage();
  await shared.goto(`${link}&play=1`);
  await expect(shared.getByRole("dialog", { name: "听听你的 2015" })).toBeVisible();
  await expect(shared.getByRole("button", { name: "点击播放" })).toBeVisible();
  expect(await shared.evaluate(() => (window as unknown as { __klineMusic?: { playing: boolean } }).__klineMusic?.playing)).toBe(false);
  await shared.close();

  // 7. mute switch persists
  await page.getByRole("button", { name: "关闭" }).click();
  await page.getByRole("button", { name: "静音" }).click();
  expect(await page.evaluate(() => localStorage.getItem("kline:muted"))).toBe("1");
  await page.reload();
  await expect(page.getByRole("button", { name: "取消静音" })).toBeVisible();
  await page.getByRole("button", { name: "取消静音" }).click();

  // 8. OG image renders (bundled font, no network needed)
  const og = await page.request.get(`/api/og?s=${new URL(link).searchParams.get("s")}`);
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toContain("image/png");
});

test("invalid result link shows an error state", async ({ page }) => {
  await page.goto("/result?s=2015.broken");
  await expect(page.getByRole("heading", { name: "链接无效" })).toBeVisible();
  await expect(page.getByRole("link", { name: "回首页" })).toBeVisible();
});

test("historical moment card pre-fills the allocation and can still be edited", async ({ page }) => {
  await page.goto("/play/2015");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: /开始第 1 回合/ }).click();
  await page.getByRole("button", { name: "平均分配" }).click();
  await page.getByRole("button", { name: /进入下个月/ }).first().click();
  await page.getByRole("dialog", { name: "本月结算" }).getByRole("button", { name: /进入下个月/ }).click();

  const card = page.getByTestId("moment-card");
  await expect(card).toBeVisible();
  await expect(card.getByRole("heading")).toContainText("1 月 19 日");
  await card.getByRole("radio", { name: "怕继续亏" }).click(); // optional reason tag
  await card.getByRole("button", { name: "减半仓" }).click();
  await expect(card).toHaveCount(0);
  // 平均分配 is four sectors + cash at 20% each, no margin; halving the risky part sends 40 more to cash
  await expect(page.getByLabel("上证50 ETF 百分比")).toHaveValue("10");
  await expect(page.getByLabel("货币基金 百分比")).toHaveValue("60");
  await expect(page.getByRole("button", { name: /进入下个月/ }).first()).toBeEnabled(); // still sums to 100
  // 现金自动补齐 (on by default): adding margin takes it from cash, the total stays 100
  await page.getByLabel("融资加杠杆 百分比").fill("10");
  await expect(page.getByLabel("货币基金 百分比")).toHaveValue("50");
  await expect(page.getByRole("button", { name: /进入下个月/ }).first()).toBeEnabled();
  // switched off, the same edit breaks the total and the button says so
  await page.getByLabel("现金自动补齐").uncheck();
  await page.getByLabel("融资加杠杆 百分比").fill("20");
  await expect(page.getByRole("button", { name: "合计需为 100%" })).toBeDisabled();

  // reload: the card is remembered as answered
  await page.reload();
  await expect(page.getByTestId("moment-card")).toHaveCount(0);
});
