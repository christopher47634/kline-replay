/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI evaluates this function expression. */
// Run against the current home page with playwright-cli run-code --filename=...
// Browser-only WebGL probe: no production instrumentation or timing mocks.
async (page) => {
  await page.addInitScript(() => {
    window.__heroProbe = {};
    for (const Context of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const names = new WeakMap();
      const get = Context.prototype.getUniformLocation;
      Context.prototype.getUniformLocation = function (program, name) {
        const location = get.call(this, program, name);
        if (location) names.set(location, name);
        return location;
      };
      const scalar = Context.prototype.uniform1f;
      Context.prototype.uniform1f = function (location, value) {
        const name = names.get(location);
        if (["uProgress", "uPlay", "uRadius"].includes(name)) window.__heroProbe[name] = value;
        return scalar.call(this, location, value);
      };
      const vector = Context.prototype.uniform2f;
      Context.prototype.uniform2f = function (location, x, y) {
        if (names.get(location) === "uMouse") window.__heroProbe.mouse = [x, y];
        return vector.call(this, location, x, y);
      };
    }
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  await page.waitForFunction(() => window.__heroProbe.uPlay >= 1.04);
  const observations = [];
  const intact = async (stage) => {
    await page.waitForTimeout(250);
    const probe = await page.evaluate(() => window.__heroProbe);
    observations.push({ stage, ...probe });
    if (probe.uProgress < .999 || probe.uPlay < 1.04) {
      throw new Error(`${stage}: chart reset to scattered particles: ${JSON.stringify(probe)}`);
    }
  };
  await page.getByRole("button", { name: "阅读设置：主题、字体、字号、文风" }).click();
  await page.getByRole("button", { name: "放大字号", exact: true }).click();
  await intact("font change");
  await page.getByRole("radio", { name: "冰川蓝", exact: true }).click();
  await intact("accent change");
  await page.getByRole("radio", { name: "绿涨红跌", exact: true }).click();
  await intact("market colours");
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  for (const width of [1120, 760, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await intact(`resize ${width}`);
  }
  const box = await page.locator(".hero-art canvas").boundingBox();
  if (!box) throw new Error("Particle canvas missing");
  await page.mouse.move(box.x + box.width * .6, box.y + box.height * .65);
  await page.waitForTimeout(100);
  const inside = await page.evaluate(() => window.__heroProbe);
  if (!inside.mouse || inside.mouse[0] === 9999 || inside.uRadius > 64) throw new Error("Pointer interaction not bounded");
  await page.mouse.move(10, 10);
  await page.waitForTimeout(100);
  const outside = await page.evaluate(() => window.__heroProbe);
  if (outside.mouse?.[0] !== 9999) throw new Error("Pointer left a persistent hole");
  await intact("pointer leave");
  await page.screenshot({ path: "output/playwright/particle-regression.png" });
  return observations;
}
