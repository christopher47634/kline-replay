import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Use the pre-installed Chromium in CI images; locally fall back to the system Chrome.
// Never run `playwright install` here.
const CI_CHROMIUM = "/opt/pw-browsers/chromium";
const executablePath = process.env.PW_CHROMIUM ?? (existsSync(CI_CHROMIUM) ? CI_CHROMIUM : undefined);
const PORT = Number(process.env.E2E_PORT ?? 3219);

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Desktop Chrome"],
    viewport: { width: 1280, height: 900 },
    launchOptions: {
      ...(executablePath ? { executablePath } : { channel: "chrome" }),
      args: ["--autoplay-policy=no-user-gesture-required"],
    },
    permissions: ["clipboard-read", "clipboard-write"],
  },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
