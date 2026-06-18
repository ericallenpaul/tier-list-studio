import { _electron as electron, expect, test, type ElectronApplication, type Page } from "@playwright/test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
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

type ExportEventArtifact = {
  filePath: string;
  format: string;
};

const waitForNextExport = (page: Page) =>
  page.evaluate(() =>
    new Promise<ExportEventArtifact>((resolve) => {
      window.addEventListener(
        "tier-studio:export-complete",
        (event) => resolve((event as CustomEvent<ExportEventArtifact>).detail),
        { once: true }
      );
    })
  );

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

    const pngPromise = waitForNextExport(page);
    await page.getByRole("button", { name: "PNG" }).click();
    const pngArtifact = await pngPromise;
    await expect(page.getByText(/\.png/i)).toBeVisible();
    expect(pngArtifact.format).toBe("png");
    expect(pngArtifact.filePath).toMatch(/Tier List Studio[\\/]Exports[\\/]exports\.png$/i);
    expect(existsSync(pngArtifact.filePath)).toBe(true);
    expect([...readFileSync(pngArtifact.filePath).subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    const jpegPromise = waitForNextExport(page);
    await page.getByRole("button", { name: "JPEG" }).click();
    const jpegArtifact = await jpegPromise;
    await expect(page.getByText(/\.jpg/i)).toBeVisible();
    expect(jpegArtifact.format).toBe("jpg");
    expect(jpegArtifact.filePath).toMatch(/Tier List Studio[\\/]Exports[\\/]exports\.jpg$/i);
    expect(existsSync(jpegArtifact.filePath)).toBe(true);
    expect([...readFileSync(jpegArtifact.filePath).subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);

    const csvPromise = waitForNextExport(page);
    await page.getByRole("button", { name: "CSV" }).click();
    const csvArtifact = await csvPromise;
    await expect(page.getByText(/\.csv/i)).toBeVisible();
    const csv = readFileSync(csvArtifact.filePath, "utf8");
    expect(csvArtifact.format).toBe("csv");
    expect(csv).toContain("list_id,list_name,row_id,row_label,row_order,container,item_id,item_label,item_kind,item_order,metadata_json");
    expect(csv).toContain("Exports");
    expect(csv).toContain("Pizza");
    expect(csv).toContain("Pasta");

    const packagePromise = waitForNextExport(page);
    await page.getByRole("button", { name: "Package" }).click();
    const packageArtifact = await packagePromise;
    await expect(page.getByText(/\.json/i)).toBeVisible();
    const packageData = JSON.parse(readFileSync(packageArtifact.filePath, "utf8")) as {
      board: { name: string };
      items: Array<{ label: string }>;
    };
    expect(packageArtifact.format).toBe("package");
    expect(packageData.board.name).toBe("Exports");
    expect(packageData.items.map((item) => item.label).sort()).toEqual(["Pasta", "Pizza"]);

    for (const artifact of [pngArtifact, jpegArtifact, csvArtifact, packageArtifact]) {
      rmSync(artifact.filePath, { force: true });
    }
  });

  test("treats duplicated boards as unsaved for saved-artifact exports", async () => {
    if (await page.getByRole("button", { name: "New Board" }).isVisible().catch(() => false)) {
      await createBoardWithItems(page, "Duplicate Export", ["Pizza"]);
    }

    const boardName = await page.locator("h1").innerText();
    await page.getByTestId("top-command-bar").getByRole("button", { name: "Duplicate" }).click();
    await expect(page.getByRole("heading", { name: `${boardName} Copy` })).toBeVisible();
    if (!(await page.getByRole("button", { name: "CSV" }).isVisible().catch(() => false))) {
      await page.getByRole("button", { name: "Export" }).click();
    }
    await expect(page.getByRole("button", { name: "CSV" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Package" })).toBeDisabled();
    await expect(page.getByText("Save the board before CSV or package export.")).toBeVisible();
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
