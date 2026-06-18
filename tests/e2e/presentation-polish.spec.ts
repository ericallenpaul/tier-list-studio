import { _electron as electron, expect, test, type ElectronApplication, type Page } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

test.describe("presentation polish", () => {
  let app: ElectronApplication | undefined;
  let page: Page;
  let userDataDir: string;

  test.beforeEach(async () => {
    test.setTimeout(60_000);
    userDataDir = mkdtempSync(join(tmpdir(), "tier-list-studio-e2e-"));

    app = await electron.launch({
      args: [projectRoot],
      cwd: projectRoot,
      env: {
        ...process.env,
        ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
        TIER_LIST_STUDIO_USER_DATA: userDataDir,
        VITE_DEV_SERVER_URL: ""
      }
    });

    page = await app.firstWindow();
    await page.setViewportSize({ width: 1280, height: 820 });
  });

  test.afterEach(async () => {
    await app?.close();
    if (userDataDir) {
      rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
    }
    app = undefined;
  });

  test("starter templates render video-ready presentation boards", async ({ page: _unused }) => {
    await page.getByRole("button", { name: "Use Template" }).click();
    await page.getByText("Midnight Neon").click();
    await page.getByRole("button", { name: "Presentation" }).click();
    await expect(page.locator(".presentation .topbar")).toBeHidden();
    await expect(page.getByRole("button", { name: "Export" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Duplicate" })).toBeHidden();
    await expect(page.getByTestId("presentation-surface")).toContainText("Instant Classic");
    await expect(page.getByTestId("presentation-surface")).toHaveScreenshot("midnight-neon-presentation.png");
  });
});
