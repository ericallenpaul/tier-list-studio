import { _electron as electron, expect, test, type ElectronApplication, type Page } from "@playwright/test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const packageJson = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf-8")) as {
  version: string;
};

const createBoard = async (page: Page, name: string) => {
  await page.getByRole("button", { name: "New Board" }).click();
  await page.getByLabel("Board title").fill(name);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
};

const ensureBoardOpen = async (page: Page, name: string) => {
  const newBoardButton = page.getByRole("button", { name: "New Board" });
  if (await newBoardButton.isVisible()) {
    await createBoard(page, name);
    return;
  }

  if (!(await page.getByRole("button", { name: "Export" }).isVisible())) {
    await page.keyboard.press("Escape");
  }
  await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
};

test.describe("secure Electron shell", () => {
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

  test("exposes the app version through the bridge only", async () => {
    const version = await page.evaluate(() => window.tierStudio.app.getVersion());

    expect(version).toBe(packageJson.version);
  });

  test("does not expose Node globals to the renderer", async () => {
    const globals = await page.evaluate(() => ({
      process: typeof globalThis.process,
      require: typeof globalThis.require
    }));

    expect(globals).toEqual({
      process: "undefined",
      require: "undefined"
    });
  });

  test("does not install a native application menu", async () => {
    const hasMenu = await app?.evaluate(({ Menu }) => Menu.getApplicationMenu() !== null);

    expect(hasMenu).toBe(false);
  });

  test("presentation mode hides editor controls but keeps the board draggable", async () => {
    await ensureBoardOpen(page, "Presentation Shell");
    await page.getByRole("button", { name: "Presentation" }).click();

    await expect(page.locator(".topbar")).toBeHidden();
    await expect(page.getByRole("button", { name: "Export" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Duplicate" })).toBeHidden();
    await expect(page.locator(".pool-strip")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
  });

  test("export writes a png artifact of the presentation surface", async () => {
    await ensureBoardOpen(page, "Export Shell");

    const exportPromise = page.evaluate(() =>
      new Promise<{ filePath: string; format: string }>((resolve) => {
        window.addEventListener(
          "tier-studio:export-complete",
          (event) => resolve((event as CustomEvent<{ filePath: string; format: string }>).detail),
          { once: true }
        );
      })
    );

    await page.getByRole("button", { name: "Export" }).click();
    await page.getByRole("button", { name: "PNG" }).click();

    const artifact = await exportPromise;
    expect(artifact.format).toBe("png");
    expect(artifact.filePath).toMatch(/(?:presentation|export)-shell.*\.png$/i);
    expect(existsSync(artifact.filePath)).toBe(true);
    await expect(page.locator(".topbar")).toBeVisible();
  });
});
