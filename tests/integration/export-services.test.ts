import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { exportCsvArtifact } from "../../src/main/services/export/exportCsvService.js";
import { exportPackageArtifact } from "../../src/main/services/export/exportPackageService.js";
import { closeDatabase, openDatabase, type SqliteDatabase } from "../../src/main/services/db/connection.js";
import { runMigrations } from "../../src/main/services/db/migrations.js";
import { createCoreListServices } from "../../src/main/services/lists/listService.js";
import { AssetRepository } from "../../src/main/services/repositories/index.js";

let tempDir: string;
let db: SqliteDatabase;
let services: ReturnType<typeof createCoreListServices>;

const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "tier-list-studio-exports-"));
  db = openDatabase({ filePath: join(tempDir, "exports.sqlite") });
  runMigrations(db);
  services = createCoreListServices(db, { userDataPath: tempDir });
});

afterEach(async () => {
  if (db.open) {
    closeDatabase(db);
  }
  await new Promise((resolve) => setTimeout(resolve, 100));
  rmSync(tempDir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
});

describe("export services", () => {
  it("writes CSV with row, item, and placement data", async () => {
    const list = await createPopulatedList();
    const artifact = await exportCsvArtifact(list, { documentsPath: tempDir });

    expect(artifact.format).toBe("csv");
    expect(artifact.filePath).toMatch(/exports\.csv$/i);
    expect(existsSync(artifact.filePath)).toBe(true);

    const csv = readFileSync(artifact.filePath, "utf8");
    expect(csv).toContain("list_id,list_name,row_id,row_label,row_order,container,item_id,item_label,item_kind,item_order,metadata_json");
    expect(csv).toContain(`"${list.id}"`.replace(/"/g, ""));
    expect(csv).toContain("Pasta");
    expect(csv).toContain("tier");
    expect(csv).toContain("Pizza");
    expect(csv).toContain("pool");
  });

  it("writes a JSON package with rehydration metadata", async () => {
    const list = await createPopulatedList();
    const artifact = await exportPackageArtifact(list, {
      appVersion: "0.1.0-test",
      documentsPath: tempDir
    });

    expect(artifact.format).toBe("package");
    expect(artifact.filePath).toMatch(/exports\.json$/i);
    expect(existsSync(artifact.filePath)).toBe(true);

    const packageData = JSON.parse(readFileSync(artifact.filePath, "utf8")) as {
      schemaVersion: number;
      app: { version: string };
      board: { id: string; name: string };
      template: { rows: Array<{ label: string; color: string }> };
      rows: unknown[];
      items: Array<{ label: string }>;
      positions: unknown[];
    };

    expect(packageData.schemaVersion).toBe(1);
    expect(packageData.app.version).toBe("0.1.0-test");
    expect(packageData.board).toEqual(expect.objectContaining({ id: list.id, name: "Exports" }));
    expect(packageData.template.rows.map((row) => row.label)).toEqual(["S", "A", "B", "C", "D"]);
    expect(packageData.rows).toHaveLength(5);
    expect(packageData.items.map((item) => item.label).sort()).toEqual(["Pasta", "Pizza"]);
    expect(packageData.positions).toHaveLength(2);
  });

  it("writes media asset records and managed file content into package exports", async () => {
    const imagePath = join(tempDir, "source pizza.png");
    writeFileSync(imagePath, pngBytes);

    const workspace = services.workspaces.create({ name: "Rankings" });
    const createdList = services.lists.create({ workspaceId: workspace.id, name: "Media Exports" });
    const [importedItem] = await services.items.importAssets(createdList.id, [imagePath]);
    const list = services.lists.get(createdList.id);
    if (!list) {
      throw new Error("Expected media export list.");
    }

    const artifact = await exportPackageArtifact(list, {
      appVersion: "0.1.0-test",
      assetRecords: new AssetRepository(db).list(),
      documentsPath: tempDir,
      userDataPath: tempDir
    });

    const packageData = JSON.parse(readFileSync(artifact.filePath, "utf8")) as {
      assets: Array<{
        id: string;
        originalName: string;
        mimeType: string;
        managedRelPath: string;
        file: {
          kind: string;
          managedRelPath: string;
          managedPathExists: boolean;
          sourcePathExists: boolean;
          encoding?: string;
          contentBase64?: string;
        };
      }>;
      items: Array<{ id: string; assetId?: string; metadata: { managedRelPath?: string } }>;
    };

    expect(packageData.items).toEqual([
      expect.objectContaining({
        id: importedItem.id,
        assetId: importedItem.assetId,
        metadata: expect.objectContaining({ managedRelPath: expect.any(String) })
      })
    ]);
    expect(packageData.assets).toEqual([
      expect.objectContaining({
        id: importedItem.assetId,
        originalName: "source pizza.png",
        mimeType: "image/png",
        managedRelPath: expect.stringMatching(/^assets[\\/][a-f0-9]{64}\.png$/),
        file: expect.objectContaining({
          kind: "embedded",
          managedPathExists: true,
          sourcePathExists: true,
          encoding: "base64",
          contentBase64: pngBytes.toString("base64")
        })
      })
    ]);
    expect(packageData.assets[0].file.managedRelPath).toBe(packageData.assets[0].managedRelPath);
  });
});

const createPopulatedList = async () => {
  const workspace = services.workspaces.create({ name: "Rankings" });
  const createdList = services.lists.create({ workspaceId: workspace.id, name: "Exports" });
  const items = services.items.addTextBatch(createdList.id, ["Pizza", "Pasta"]);
  const list = services.lists.get(createdList.id);
  if (!list?.rows?.[0]) {
    throw new Error("Expected default rows.");
  }

  await services.positions.move({
    listId: createdList.id,
    itemIds: [items[1].id],
    targetRowId: list.rows[0].id,
    targetIndex: 0
  });

  const populated = services.lists.get(createdList.id);
  if (!populated) {
    throw new Error("Expected populated list.");
  }

  return populated;
};
