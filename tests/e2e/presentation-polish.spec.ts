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
    await expect(page.getByTestId("presentation-surface").locator(".tier-label", { hasText: "Main Stage" }))
      .toHaveCSS("color", "rgb(6, 17, 31)");
    await expect(page.getByTestId("presentation-surface").locator(".tier-items .item-chip", { hasText: "Cold Open" }))
      .toHaveCSS("color", "rgb(248, 250, 252)");
  });

  test("clean studio presentation keeps bright chips and readable row labels", async () => {
    await page.getByRole("button", { name: "Use Template" }).click();
    await page.getByText("Clean Studio").click();
    await page.getByRole("button", { name: "Add Items" }).click();
    await page.getByLabel("Items").fill("Parking Lot");
    await page.getByRole("button", { name: "Add 1 Item" }).click();
    await page.getByRole("button", { name: "Presentation" }).click();

    const surface = page.getByTestId("presentation-surface");
    const placedChip = surface.locator(".tier-items .item-chip", { hasText: "Hero Layout" });
    const poolChip = surface.locator(".pool-grid .item-chip", { hasText: "Parking Lot" });
    const readyLabel = surface.locator(".tier-label", { hasText: "Ready" });

    await expect(surface).toContainText("Hero Layout");
    await expect(placedChip).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(placedChip).toHaveCSS("color", "rgb(15, 23, 42)");
    await expect(poolChip).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(poolChip).toHaveCSS("color", "rgb(15, 23, 42)");
    await expect(readyLabel).toHaveCSS("color", "rgb(4, 47, 46)");
  });
});
