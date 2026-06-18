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

test.describe("editor layout", () => {
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

  test("build mode has editor regions and presentation has no controls", async () => {
    await createBoard(page, "Layout Test");
    await expect(page.getByTestId("top-command-bar")).toBeVisible();
    await expect(page.getByTestId("metadata-strip")).toBeVisible();
    await expect(page.getByTestId("tier-board")).toBeVisible();
    await expect(page.getByTestId("item-dock")).toBeVisible();
    await expect(page.getByTestId("bottom-rail")).toBeVisible();
    await page.getByRole("button", { name: "Presentation" }).click();
    await expect(page.getByTestId("top-command-bar")).toBeHidden();
    await expect(page.getByRole("button", { name: "Export" })).toBeHidden();
  });
});
