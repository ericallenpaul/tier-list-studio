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
  await page.getByRole("button", { name: `Add ${items.length} ${items.length === 1 ? "Item" : "Items"}` }).click();
  await expect(page.getByTestId("item-dock")).toContainText(items[0]);
};

test.describe("search and AI item generation", () => {
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

  test("searches existing items and generates local AI suggestions", async () => {
    await createBoardWithItems(page, "AI", ["Pizza", "Pasta"]);
    await page.getByRole("button", { name: "Add Items" }).click();
    await page.getByRole("tab", { name: "Search" }).click();
    await page.getByPlaceholder("Search library").fill("Piz");
    await expect(page.getByText("Pizza")).toBeVisible();
    await page.getByRole("tab", { name: "AI" }).click();
    await page.getByLabel("Prompt").fill("Generate five breakfast foods");
    await page.getByRole("button", { name: "Generate" }).click();
    await expect(page.getByTestId("generated-items")).toContainText("Pancakes");
  });
});
