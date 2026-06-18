import { _electron as electron, expect, test, type ElectronApplication, type Page } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const createBoardWithItems = async (page: Page, name: string, items: string[]) => {
  await page.getByRole("button", { name: "New Board" }).click();
  await page.getByLabel("Board title").fill(name);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();

  await page.getByRole("button", { name: "Add Items" }).click();
  await page.getByRole("tab", { name: "Text" }).click();
  await page.getByLabel("Items").fill(items.join("\n"));
  await page.getByRole("button", { name: `Add ${items.length} ${items.length === 1 ? "Item" : "Items"}` }).click();
  for (const item of items) {
    await expect(page.getByTestId("item-dock")).toContainText(item);
  }
};

test.describe("export flow", () => {
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

  test("exports png, jpeg, csv, and package artifacts", async () => {
    await createBoardWithItems(page, "Exports", ["Pizza", "Pasta"]);
    await page.getByRole("button", { name: "Export" }).click();

    await page.getByRole("button", { name: "PNG" }).click();
    await expect(page.getByText(/\.png/i)).toBeVisible();

    await page.getByRole("button", { name: "JPEG" }).click();
    await expect(page.getByText(/\.jpg/i)).toBeVisible();

    await page.getByRole("button", { name: "CSV" }).click();
    await expect(page.getByText(/\.csv/i)).toBeVisible();

    await page.getByRole("button", { name: "Package" }).click();
    await expect(page.getByText(/\.json/i)).toBeVisible();
  });

  test("keeps export controls out of presentation mode", async () => {
    if (await page.getByRole("button", { name: "New Board" }).isVisible().catch(() => false)) {
      await createBoardWithItems(page, "Presentation Export", ["Pizza"]);
    }

    await page.getByRole("button", { name: "Presentation" }).click();
    await expect(page.getByTestId("presentation-surface")).toBeVisible();
    await expect(page.getByRole("button", { name: "Export" })).toHaveCount(0);
  });
});
