import { _electron as electron, expect, test, type ElectronApplication, type Page } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const createBoard = async (page: Page, name: string) => {
  await page.getByRole("button", { name: "New Board" }).click();
  await page.getByLabel("Board title").fill(name);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
};

test.describe("board editing", () => {
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
  });

  test.afterEach(async () => {
    await app?.close();
    if (userDataDir) {
      rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
    }
    app = undefined;
  });

  test("renames, recolors, reorders, and deletes tier rows", async () => {
    await createBoard(page, "Rows");
    await page.getByRole("button", { name: "Edit row S" }).click();
    await page.getByLabel("Row label").fill("Top");
    await page.getByLabel("Row color").fill("#ff00aa");
    await page.getByRole("button", { name: "Save row" }).click();
    await expect(page.getByText("Top")).toBeVisible();
  });

  test("persists item movement after reload", async () => {
    await createBoard(page, "Persisted Movement");
    await page.getByRole("button", { name: "Add Items" }).click();
    await page.getByRole("tab", { name: "Text" }).click();
    await page.getByLabel("Items").fill("Pizza");
    await page.getByRole("button", { name: "Add 1 Item" }).click();

    await page.getByRole("button", { name: "Pizza" }).click();
    await page.locator(".tier-row").filter({ hasText: "S" }).press("Enter");
    await expect(page.locator(".tier-row").filter({ hasText: "S" })).toContainText("Pizza");

    await page.reload();
    await expect(page.getByRole("heading", { name: "Persisted Movement" })).toBeVisible();
    await expect(page.locator(".tier-row").filter({ hasText: "S" })).toContainText("Pizza");
  });
});
