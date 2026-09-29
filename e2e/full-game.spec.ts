import { expect, test } from "@playwright/test";

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
    await page.getByRole("button", { name: "平均分配" }).click();
    await page.getByRole("button", { name: /进入下个月|结算最后一个月/ }).first().click();
    const dialog = page.getByRole("dialog", { name: "本月结算" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /进入下个月|查看年终结算/ }).click();
  }

  // 3. result page
  await expect(page).toHaveURL(/\/result\?s=2015\./, { timeout: 15_000 });
  const ret = page.getByTestId("final-return");
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
});

test("invalid result link shows an error state", async ({ page }) => {
  await page.goto("/result?s=2015.broken");
  await expect(page.getByRole("heading", { name: "链接无效" })).toBeVisible();
  await expect(page.getByRole("link", { name: "回首页" })).toBeVisible();
});
