import { expect, test } from "@playwright/test";

test("plays a full event-mode game, shares it, and reopens the result", async ({ page, context }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/events");
  await page.getByRole("link", { name: /A 股经典时刻/ }).click();
  await expect(page).toHaveURL(/\/events\/a-share-classics$/);
  await page.getByRole("button", { name: "开始" }).click();

  for (let n = 0; n < 10; n++) {
    await expect(page.getByTestId("event-card")).toBeVisible();
    await page.getByTestId(n % 2 ? "guess-down" : "guess-up").click();
    await expect(page.getByTestId("event-reveal")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("next-card").click();
  }

  await expect(page).toHaveURL(/\/events\/a-share-classics\/result\?s=/);
  const total = await page.getByTestId("event-total").textContent();
  await expect(page.getByTestId("event-row")).toHaveCount(10);

  await page.getByRole("button", { name: "复制链接" }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  const other = await context.newPage();
  await other.goto(link);
  await expect(other.getByTestId("event-total")).toHaveText(total!);
  await other.close();

  expect(errors).toEqual([]);
});

test("advanced mode needs a direction then a magnitude bucket", async ({ page }) => {
  await page.goto("/events/global-black-swans");
  await page.getByLabel(/进阶模式/).check();
  await page.getByRole("button", { name: "开始" }).click();
  await expect(page.getByTestId("bucket-2")).toBeDisabled();
  await page.getByTestId("guess-up").click();
  await page.getByTestId("bucket-3").click();
  await expect(page.getByTestId("event-reveal")).toBeVisible({ timeout: 10_000 });
});

test("tampered event link shows an error state", async ({ page }) => {
  await page.goto("/events/a-share-classics/result?s=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
  await expect(page.getByRole("heading", { name: "链接无效" })).toBeVisible();
});
