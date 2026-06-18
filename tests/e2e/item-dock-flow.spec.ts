import { _electron as electron, expect, test, type ElectronApplication, type Page } from "@playwright/test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

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

const poolLabelsFromPersistedBoard = (page: Page) =>
  page.evaluate(() => {
    const raw = localStorage.getItem("tier-list-studio-state");
    if (!raw) {
      return [];
    }
    const state = JSON.parse(raw) as { board?: { items?: Array<{ label: string; container: string }> } };
    return state.board?.items?.filter((item) => item.container === "pool").map((item) => item.label) ?? [];
  });

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

  test("filters and edits item labels", async () => {
    await createBoardWithItems(page, "Dock", ["Pizza", "Pasta", "Tacos"]);
    await page.getByPlaceholder("Filter items").fill("Piz");
    await expect(page.getByText("Pizza")).toBeVisible();
    await expect(page.getByText("Pasta")).toBeHidden();
    await page.getByText("Pizza").click();
    await page.getByLabel("Item label").fill("Neapolitan Pizza");
    await page.getByRole("button", { name: "Save item" }).click();
    await expect(page.getByRole("button", { name: "Neapolitan Pizza" })).toBeVisible();
    await expect(page.getByLabel("Item label")).toHaveValue("Neapolitan Pizza");
  });

  test("duplicates checked text items", async () => {
    await createBoardWithItems(page, "Dock Duplicate", ["Pizza", "Pasta"]);

    await page.getByLabel("Select Pizza").check();
    await page.getByTestId("item-dock").getByRole("button", { name: "Duplicate" }).click();

    await expect(page.getByRole("button", { name: "Pizza Copy" })).toBeVisible();
  });

  test("blocks checked media item duplicates with a visible reason", async () => {
    const imagePath = join(userDataDir, "media pizza.png");
    writeFileSync(imagePath, pngBytes);
    await createBoard(page, "Dock Media Duplicate");
    await app?.evaluate(({ dialog }, selectedPath) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selectedPath] });
    }, imagePath);

    await page.getByRole("button", { name: "Add Items" }).click();
    await page.getByRole("tab", { name: "Images" }).click();
    await page.getByRole("button", { name: "Choose Images" }).click();
    await expect(page.getByRole("button", { name: "media pizza" })).toBeVisible();

    await page.getByLabel("Select media pizza").check();

    await expect(page.getByTestId("item-dock").getByRole("button", { name: "Duplicate" })).toBeDisabled();
    await expect(page.getByText("Duplicate is available for text items only.")).toBeVisible();
  });

  test("sends only checked placed items back to the pool without reordering checked pool items", async () => {
    await createBoardWithItems(page, "Dock Bulk", ["Alpha", "Beta", "Gamma"]);

    await page.getByLabel("Select Beta").check();
    await page.getByLabel("Select Gamma").check();
    await expect(page.getByRole("button", { name: "Send to pool" })).toBeDisabled();
    await expect(page.getByText("Send to pool applies to placed items.")).toBeVisible();

    await page.getByRole("button", { name: "Alpha" }).click();
    await page.locator(".tier-row").first().press("Enter");
    await expect(page.locator(".tier-row").first().getByRole("button", { name: "Alpha" })).toBeVisible();

    await page.getByLabel("Select Alpha").check();
    await page.getByRole("button", { name: "Send to pool" }).click();

    await expect(page.locator(".tier-row").first().getByRole("button", { name: "Alpha" })).toHaveCount(0);
    await expect(page.getByTestId("item-dock")).toContainText("Pool");
    await expect.poll(() => poolLabelsFromPersistedBoard(page)).toEqual(["Beta", "Gamma", "Alpha"]);
  });

  test("shows bulk action failures", async () => {
    await createBoardWithItems(page, "Dock Failure", ["Pizza"]);
    await page.getByRole("button", { name: "Pizza" }).click();
    await page.locator(".tier-row").first().press("Enter");
    await expect(page.locator(".tier-row").first().getByRole("button", { name: "Pizza" })).toBeVisible();
    await app?.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler("positions:move");
      ipcMain.handle("positions:move", () => {
        throw new Error("Move failed by test");
      });
    });

    await page.getByLabel("Select Pizza").check();
    await page.getByRole("button", { name: "Send to pool" }).click();

    await expect(page.getByText("Move failed by test")).toBeVisible();
  });

  test("presentation mode hides item dock controls and inspector", async () => {
    await createBoardWithItems(page, "Dock Presentation", ["Pizza"]);

    await page.getByRole("button", { name: "Presentation" }).click();

    await expect(page.getByPlaceholder("Filter items")).toBeHidden();
    await expect(page.getByLabel("Bulk item actions")).toBeHidden();
    await expect(page.getByLabel("Item inspector")).toBeHidden();
    await expect(page.getByRole("button", { name: "Send to pool" })).toBeHidden();
    await expect(page.getByText("Select an item to edit it.")).toBeHidden();
  });
});
