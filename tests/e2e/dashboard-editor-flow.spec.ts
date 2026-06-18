import { _electron as electron, expect, test, type ElectronApplication, type Page } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

test.describe("dashboard editor flow", () => {
  let app: ElectronApplication | undefined;
  let page: Page;
  let userDataDir: string;

  test.beforeAll(async () => {
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
  });

  test.afterAll(async () => {
    await app?.close();
    if (userDataDir) {
      rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
    }
  });

  test("creates a board from the dashboard and reopens it after reload", async () => {
    await page.getByRole("button", { name: "New Board" }).click();
    await page.getByLabel("Board title").fill("Snack Ranking");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("heading", { name: "Snack Ranking" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Snack Ranking" })).toBeVisible();
  });

  test("preserves local editor items for the active DB board after reload", async () => {
    const itemName = "Reload Proof Pickle";

    await page.evaluate(() => window.sessionStorage.removeItem("tier-list-studio-editor-session"));
    await page.reload();
    await page.getByRole("button", { name: "New Board" }).click();
    await page.getByLabel("Board title").fill("Reload Survival");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("heading", { name: "Reload Survival" })).toBeVisible();

    await page.evaluate((name) => {
      window.prompt = () => name;
    }, itemName);
    await page.getByRole("button", { name: "New item" }).click();
    await expect(page.getByRole("button", { name: itemName })).toBeVisible();

    await page.getByRole("button", { name: itemName }).click();
    await page.locator(".tier-row").first().click();
    await expect(page.locator(".tier-row").first().getByRole("button", { name: itemName })).toBeVisible();

    await page.waitForFunction(
      ({ expectedName }) => {
        const raw = window.localStorage.getItem("tier-list-studio-state");
        if (!raw) {
          return false;
        }

        const state = JSON.parse(raw) as {
          board?: { items?: Array<{ label: string; container: string }> };
        };
        return state.board?.items?.some((item) => item.label === expectedName && item.container === "s") ?? false;
      },
      { expectedName: itemName }
    );

    await page.reload();
    await expect(page.getByRole("heading", { name: "Reload Survival" })).toBeVisible();
    await expect(page.locator(".tier-row").first().getByRole("button", { name: itemName })).toBeVisible();
  });
});
