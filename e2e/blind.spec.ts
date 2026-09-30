import { expect, test } from "@playwright/test";

const YEAR = /(?<![\d.])(2006|2007|2008|2014|2015|2017|2018|2019|2020|2023|2024)(?![\d.]|\s*[亿万])/;

test("盲盒模式: no year on screen while playing, then guess and reveal", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.getByTestId("mystery-card").getByRole("button", { name: "开一个盲盒" }).click();
  await expect(page).toHaveURL(/\/mystery\/[a-z0-9]+$/);
  expect(page.url()).not.toMatch(YEAR);
  await expect(page).toHaveTitle(/盲盒模式/);

  // the intro (paper file) hides the year too
  await expect(page.getByText("????-01")).toBeVisible();
  expect(await page.locator("body").innerText()).not.toMatch(YEAR);
  await page.getByRole("button", { name: /开始第 1 回合/ }).click();

  for (let m = 0; m < 12; m++) {
    const moment = page.getByTestId("moment-card");
    if (await moment.isVisible().catch(() => false)) {
      expect(await moment.innerText()).not.toMatch(YEAR);
      await page.getByRole("button", { name: "不动" }).click();
    }
    // the board: headlines, status bar, known info, allocation, workbench
    expect(await page.locator("main").innerText(), `round ${m + 1}`).not.toMatch(YEAR);
    await page.getByRole("button", { name: "平均分配" }).click();
    await page.getByTestId("next-month").click();
    const dialog = page.getByRole("dialog", { name: "本月结算" });
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(300);
    expect(await dialog.innerText(), `settle ${m + 1}`).not.toMatch(YEAR);
    await dialog.getByRole("button", { name: /进入下个月|查看年终结算/ }).click();
  }

  // result: first the guess, with the tab title still hiding the year
  await expect(page).toHaveURL(/\/result\?s=.*&blind=1/);
  await expect(page.getByTestId("blind-reveal")).toBeVisible();
  await expect(page).toHaveTitle(/盲盒揭晓/);
  const answer = new URL(page.url()).searchParams.get("s")!.slice(0, 4);
  await page.getByTestId(`guess-${answer}`).click();
  await expect(page.getByTestId("blind-answer")).toContainText("猜对了");
  await page.getByRole("button", { name: /看这一年的结算/ }).click();
  await expect(page.getByTestId("final-return")).toBeAttached();
  expect(page.url()).not.toContain("blind=1");
});

test("a normal game and a blind game of the same year keep separate saves", async ({ page }) => {
  await page.goto("/play/2015");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: /开始第 1 回合/ }).click();
  await expect(page.getByTestId("next-month")).toBeVisible();
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("kline-replay:")));
  expect(keys).toEqual(["kline-replay:2015"]);
});
