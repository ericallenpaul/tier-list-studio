import { _electron as electron, expect, test, type ElectronApplication, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
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
});
