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

test.describe("settings and templates", () => {
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

  test("saves provider settings outside the board and creates a reusable template", async () => {
    await createBoard(page, "Template Source");
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByLabel("OpenAI API key").fill("test-key");
    await page.getByRole("button", { name: "Save Settings" }).click();
    await expect(page.getByTestId("tier-board")).toBeHidden();
    await page.getByRole("button", { name: "Board" }).click();
    await page.getByRole("button", { name: "Save as Template" }).click();
    await page.getByLabel("Template name").fill("Starter Creator Board");
    await page.getByRole("button", { name: "Save Template" }).click();
    await expect(page.getByText("Starter Creator Board")).toBeVisible();
  });
});
