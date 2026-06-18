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

test.describe("add items flow", () => {
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

  test("adds text items from the Add Items modal", async () => {
    await createBoard(page, "Text Items");
    await page.getByRole("button", { name: "Add Items" }).click();
    await page.getByRole("tab", { name: "Text" }).click();
    await page.getByLabel("Items").fill("Pizza\nPasta\nTacos");
    await page.getByRole("button", { name: "Add 3 Items" }).click();
    await expect(page.getByTestId("item-dock")).toContainText("Pizza");
    await expect(page.getByTestId("item-dock")).toContainText("Tacos");
  });

  test("keeps the Add Items modal open when media picking is canceled", async () => {
    if (await page.getByRole("button", { name: "New Board" }).isVisible()) {
      await createBoard(page, "Canceled Picker");
    }
    await app?.evaluate(({ dialog }) => {
      dialog.showOpenDialog = async () => ({ canceled: true, filePaths: [] });
    });

    await page.getByRole("button", { name: "Add Items" }).click();
    await page.getByRole("tab", { name: "Images" }).click();
    await page.getByRole("button", { name: "Choose Images" }).click();

    await expect(page.getByRole("dialog", { name: "Add content" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Choose Images" })).toBeEnabled();
  });
});
