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

const createBoardWithItems = async (page: Page, name: string, items: string[]) => {
  await createBoard(page, name);
  await page.getByRole("button", { name: "Add Items" }).click();
  await page.getByRole("tab", { name: "Text" }).click();
  await page.getByLabel("Items").fill(items.join("\n"));
  await page.getByRole("button", { name: `Add ${items.length} Items` }).click();
  await expect(page.getByTestId("item-dock")).toContainText(items[0]);
};

test.describe("item dock flow", () => {
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

  test("filters, edits, and sends selected items back to pool", async () => {
    await createBoardWithItems(page, "Dock", ["Pizza", "Pasta", "Tacos"]);
    await page.getByPlaceholder("Filter items").fill("Piz");
    await expect(page.getByText("Pizza")).toBeVisible();
    await expect(page.getByText("Pasta")).toBeHidden();
    await page.getByText("Pizza").click();
    await page.getByLabel("Item label").fill("Neapolitan Pizza");
    await page.getByRole("button", { name: "Save item" }).click();
    await expect(page.getByText("Neapolitan Pizza")).toBeVisible();
  });

  test("sends checked placed items back to the pool", async () => {
    await createBoardWithItems(page, "Dock Bulk", ["Pizza", "Pasta"]);

    await page.getByRole("button", { name: "Pizza" }).click();
    await page.locator(".tier-row").first().press("Enter");
    await expect(page.locator(".tier-row").first().getByRole("button", { name: "Pizza" })).toBeVisible();

    await page.getByLabel("Select Pizza").check();
    await page.getByRole("button", { name: "Send to pool" }).click();

    await expect(page.locator(".tier-row").first().getByRole("button", { name: "Pizza" })).toHaveCount(0);
    await expect(page.getByTestId("item-dock")).toContainText("Pool");
  });
});
