import { expect, test, type Page } from "@playwright/test";
import { encodeGame } from "../src/game/encode";

/** Plays the remaining rounds with 平均分配, taking 「不动」 on any historical-moment card. */
async function playOut(page: Page, rounds: number, onRound?: (m: number) => Promise<void>) {
  for (let m = 0; m < rounds; m++) {
    const card = page.getByTestId("moment-card");
    if (await card.isVisible().catch(() => false)) await card.getByRole("button", { name: "不动" }).click();
    await onRound?.(m);
    await page.getByRole("button", { name: "平均分配" }).click();
    await page.getByRole("button", { name: /进入下个月|结算最后一个月/ }).first().click();
    const dialog = page.getByRole("dialog", { name: "本月结算" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /进入下个月|查看年终结算/ }).click();
  }
}

test("任务卡: a challenge link pre-selects the card, its rules gate the button, and the result reports it", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/play/2015");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/play/2015?t=guard");
  await expect(page.getByRole("radio", { name: /守住本金/ })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: /开始第 1 回合（守住本金）/ }).click();
  await expect(page.getByTestId("task-chip")).toContainText("守住本金");

  // all cash breaks 「风险资产至少 20%」: the button names the rule
  await page.getByRole("button", { name: "全部现金" }).click();
  await expect(page.getByTestId("next-month")).toBeDisabled();
  await expect(page.getByTestId("next-month")).toContainText("风险资产至少 20%");
  // margin is not allowed either
  await page.getByRole("button", { name: "平均分配" }).click();
  await page.getByLabel("融资加杠杆 百分比").fill("10");
  await expect(page.getByTestId("next-month")).toContainText("不能用融资");

  // first month: say we doubt the rumour; the settle dialog answers it in three separate lines
  await page.getByRole("button", { name: "平均分配" }).click();
  await page.getByRole("radio", { name: "暂不采信" }).click();
  await page.getByTestId("next-month").click();
  const dialog = page.getByRole("dialog", { name: "本月结算" });
  await expect(dialog.getByTestId("rumor-check")).toContainText("你没采信它");
  await expect(dialog.getByTestId("rumor-check")).toContainText(/成真了|没兑现/);
  await dialog.getByRole("button", { name: /进入下个月/ }).click();

  // a moment with a reason
  const card = page.getByTestId("moment-card");
  await expect(card).toBeVisible();
  await card.getByRole("radio", { name: "怕继续亏" }).click();
  await card.getByRole("button", { name: "不动" }).click();
  await playOut(page, 11);

  await expect(page).toHaveURL(/\/result\?s=2015\.[^&]+&t=guard&n=/, { timeout: 15_000 });
  await expect(page.getByTestId("first-screen")).toBeVisible();
  await expect(page.getByTestId("task-outcome")).toContainText("守住本金");
  const replay = page.getByTestId("decision-replay");
  await expect(replay).toContainText("怕继续亏");
  await expect(replay.getByTestId("counterfactual")).toHaveCount(3);
  await expect(page.getByTestId("persona-evidence")).toBeVisible();
  await expect(page.getByRole("button", { name: /同一年换个目标：跑赢指数/ })).toBeVisible();

  // a new game resets the moment cards (they used to stay "answered" forever)
  await page.getByRole("button", { name: /再挑战一次「守住本金」/ }).click();
  await expect(page).toHaveURL(/\/play\/2015\?t=guard$/);
  await page.getByRole("button", { name: /开始第 1 回合/ }).click();
  await playOut(page, 1);
  await expect(page.getByTestId("moment-card")).toBeVisible();
  expect(errors).toEqual([]);
});

test("12 秒高光 plays only the three stretches", async ({ page }) => {
  const even = { sh50: 20, cyb: 20, bank: 20, baijiu: 20, cash: 20, margin: 0 };
  await page.goto(`/result?s=${encodeGame("2015", Array(12).fill(even))}`);
  await page.getByTestId("play-highlight").click();
  const modal = page.getByRole("dialog", { name: /听听你的 2015/ });
  await expect(modal.getByTestId("music-segments").locator("li")).toHaveCount(3);
  await expect(modal.getByTestId("music-mode")).toContainText("听完整版");
});

test("盲盒结算后：再开一个盲盒 / 复盘本年", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.getByRole("button", { name: "开一个盲盒" }).click();
  await expect(page).toHaveURL(/\/mystery\//);
  await page.getByRole("button", { name: /开始第 1 回合/ }).click();
  await playOut(page, 12);
  await expect(page).toHaveURL(/blind=1/, { timeout: 15_000 });
  const answer = new URL(page.url()).searchParams.get("s")!.slice(0, 4);
  await page.getByTestId(`guess-${answer}`).click();
  await page.getByRole("button", { name: /看这一年的结算/ }).click();
  await expect(page.getByRole("button", { name: "再开一个盲盒" })).toBeVisible();
  await expect(page.getByRole("button", { name: /复盘本年/ })).toBeVisible();
  const before = page.url();
  await page.getByRole("button", { name: "再开一个盲盒" }).click();
  await expect(page).toHaveURL(/\/mystery\//);
  expect(page.url()).not.toBe(before);
});

test("home: crossing the 767px breakpoint after the pinned story mounted does not crash", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForTimeout(2500);
  await page.mouse.wheel(0, 1400);
  await page.waitForTimeout(800);
  for (const w of [800, 758, 1440, 700, 1200]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(700);
  }
  await expect(page.getByRole("heading", { name: "选一个年份" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("theme no longer hides data: 简约 folds it into 更多数据", async ({ page }) => {
  await page.goto("/play/2015");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("kline:prefs", JSON.stringify({ skin: "plain" }));
  });
  await page.reload();
  await page.getByRole("button", { name: /开始第 1 回合/ }).click();
  const more = page.getByTestId("more-data");
  await expect(more).toBeVisible();
  await more.locator("summary").click();
  await expect(more.getByTestId("workbench")).toBeVisible();
  await expect(more.getByTestId("replay-last")).toBeVisible();
});

test("events: magnitudes follow the chosen direction, repeats are labelled practice", async ({ page }) => {
  await page.goto("/events/a-share-classics");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByLabel(/进阶模式/).check();
  await page.getByRole("button", { name: "开始" }).click();
  await expect(page.getByTestId("event-kind")).toHaveText("首次挑战");
  await page.getByTestId("guess-down").click();
  await expect(page.getByTestId("bucket-3")).toHaveCount(0); // 「跌」 cannot be paired with +3% ~ +10%
  await expect(page.getByTestId("bucket-1")).toContainText("跌 3% ~ 10%");
  await page.getByTestId("bucket-1").click();
  // answer first, curve after: the score and 下一张 are there before the replay ends
  await expect(page.getByTestId("event-reveal")).toBeVisible();
  await expect(page.getByTestId("next-card")).toBeEnabled();
});
