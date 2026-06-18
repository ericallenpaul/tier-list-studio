import { _electron as electron, expect, test, type ElectronApplication, type Page } from "@playwright/test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const previewPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64"
);

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

  test("renders imported image media previews in build and presentation mode", async () => {
    const openDialog = page.getByRole("dialog", { name: "Add content" });
    if (await openDialog.isVisible().catch(() => false)) {
      await page.getByRole("button", { name: "Close" }).click();
    }
    if (await page.getByRole("button", { name: "New Board" }).isVisible().catch(() => false)) {
      await createBoard(page, "Imported Media Preview");
    }

    const imagePath = join(userDataDir, "preview pizza.png");
    writeFileSync(imagePath, previewPng);
    await app?.evaluate(({ dialog }, pickedPath) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [pickedPath] });
    }, imagePath);

    await page.getByRole("button", { name: "Add Items" }).click();
    await page.getByRole("tab", { name: "Images" }).click();
    await page.getByRole("button", { name: "Choose Images" }).click();

    await expect(page.getByRole("dialog", { name: "Add content" })).toBeHidden();
    await expect(page.getByTestId("item-dock").getByRole("button", { name: "preview pizza" })).toBeVisible();
    await expect(page.getByTestId("item-dock").locator("img.media-preview-image")).toHaveCount(1);

    await page.getByRole("button", { name: "Presentation" }).click();
    await expect(page.getByTestId("presentation-surface").getByTestId("item-dock").locator("img.media-preview-image"))
      .toHaveCount(1);
  });
});
