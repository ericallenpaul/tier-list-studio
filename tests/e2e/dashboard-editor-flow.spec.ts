import { _electron as electron, expect, test, type ElectronApplication, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
const betterSqliteBuild = resolve(dirname(require.resolve("better-sqlite3/package.json")), "build");

const runBuild = () => {
  execSync("corepack pnpm run build", {
    cwd: projectRoot,
    stdio: "inherit"
  });
  rmSync(betterSqliteBuild, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
  execSync("corepack pnpm exec electron-builder install-app-deps", {
    cwd: projectRoot,
    stdio: "inherit"
  });
};

test.describe("dashboard editor flow", () => {
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

  test("creates a board from the dashboard and reopens it after reload", async () => {
    await page.getByRole("button", { name: "New Board" }).click();
    await page.getByLabel("Board title").fill("Snack Ranking");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("heading", { name: "Snack Ranking" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Snack Ranking" })).toBeVisible();
  });
});
