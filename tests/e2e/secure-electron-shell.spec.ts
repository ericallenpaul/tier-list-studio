import { _electron as electron, expect, test, type ElectronApplication, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const packageJson = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf-8")) as {
  version: string;
};

const runBuild = () => {
  execSync("corepack pnpm run build", {
    cwd: projectRoot,
    stdio: "inherit"
  });
};

test.describe("secure Electron shell", () => {
  let app: ElectronApplication | undefined;
  let page: Page;

  test.beforeAll(async () => {
    test.setTimeout(60_000);
    runBuild();

    app = await electron.launch({
      args: [projectRoot],
      cwd: projectRoot,
      env: {
        ...process.env,
        ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
        VITE_DEV_SERVER_URL: ""
      }
    });

    page = await app.firstWindow();
  });

  test.afterAll(async () => {
    await app?.close();
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
    await page.getByRole("button", { name: "Presentation" }).click();

    await expect(page.locator(".topbar")).toBeHidden();
    await expect(page.getByRole("button", { name: "Export" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Duplicate" })).toBeHidden();
    await expect(page.locator(".pool-strip")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
  });

  test("export writes a png artifact of the presentation surface", async () => {
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

    const artifact = await exportPromise;
    expect(artifact.format).toBe("png");
    expect(artifact.filePath).toMatch(/launch-week.*\.png$/i);
    expect(existsSync(artifact.filePath)).toBe(true);
    await expect(page.locator(".topbar")).toBeHidden();
  });
});
