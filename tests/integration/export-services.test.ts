import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { readFile as fsReadFile, stat as fsStat } from "node:fs/promises";
import type { Stats } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { exportCsvArtifact } from "../../src/main/services/export/exportCsvService.js";
import { exportPackageArtifact } from "../../src/main/services/export/exportPackageService.js";
import { closeDatabase, openDatabase, type SqliteDatabase } from "../../src/main/services/db/connection.js";
import { runMigrations } from "../../src/main/services/db/migrations.js";
import { createCoreListServices } from "../../src/main/services/lists/listService.js";
import { AssetRepository } from "../../src/main/services/repositories/index.js";
import type { MediaAssetRecord } from "../../src/main/services/repositories/types.js";
import type { TierListDetail } from "../../src/shared/models/api.js";

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

  it("writes CSV rows for empty tiers", async () => {
    const list = await createPopulatedList();
    const artifact = await exportCsvArtifact(list, { documentsPath: tempDir });
    const csv = readFileSync(artifact.filePath, "utf8");
    const lines = csv.trimEnd().split("\n");

    expect(lines).toHaveLength(7);
    expect(lines).toContain(`${list.id},Exports,${list.rows[1].id},A,1,tier,,,,,`);
    expect(lines).toContain(`${list.id},Exports,${list.rows[4].id},D,4,tier,,,,,`);
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
    const { importedItem, list } = await createMediaList();

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
        sourcePath?: string;
        file: {
          kind: string;
          managedRelPath: string;
          managedPath?: string;
          sourcePath?: string;
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
    expect(packageData.assets[0].sourcePath).toBeUndefined();
    expect(packageData.assets[0].file.managedPath).toBeUndefined();
    expect(packageData.assets[0].file.sourcePath).toBeUndefined();
    expect(JSON.stringify(packageData)).not.toContain(escapeJsonPath(tempDir));
  });

  it("writes local-reference package metadata when a managed asset file is missing", async () => {
    const { list } = await createMediaList();
    const assetRecords = new AssetRepository(db).list();
    rmSync(join(tempDir, assetRecords[0].managedRelPath), { force: true });

    const artifact = await exportPackageArtifact(list, {
      appVersion: "0.1.0-test",
      assetRecords,
      documentsPath: tempDir,
      userDataPath: tempDir
    });

    const packageData = JSON.parse(readFileSync(artifact.filePath, "utf8")) as {
      assets: Array<{ file: { kind: string; managedPathExists: boolean; reason?: string; contentBase64?: string } }>;
    };

    expect(packageData.assets[0].file).toEqual(expect.objectContaining({
      kind: "local-reference",
      managedPathExists: false,
      reason: "Managed asset file was not found at package export time."
    }));
    expect(packageData.assets[0].file.contentBase64).toBeUndefined();
  });

  it("writes local-reference package metadata when a managed asset file cannot be accessed", async () => {
    const { list } = await createMediaList();
    const assetRecords = new AssetRepository(db).list();
    const managedPath = join(tempDir, assetRecords[0].managedRelPath);
    const deniedError = Object.assign(new Error("denied"), { code: "EACCES" });

    const artifact = await exportPackageArtifact(list, {
      appVersion: "0.1.0-test",
      assetRecords,
      documentsPath: tempDir,
      fileSystem: {
        readFile: fsReadFile,
        stat: (async (filePath) => {
          if (filePath === managedPath) {
            throw deniedError;
          }
          return fsStat(filePath);
        }) as typeof fsStat
      },
      userDataPath: tempDir
    });

    const packageData = JSON.parse(readFileSync(artifact.filePath, "utf8")) as {
      assets: Array<{ file: { kind: string; managedPathExists: boolean; reason?: string; contentBase64?: string } }>;
    };

    expect(packageData.assets[0].file).toEqual(expect.objectContaining({
      kind: "local-reference",
      managedPathExists: false,
      reason: "Managed asset file could not be accessed at package export time: EACCES."
    }));
    expect(packageData.assets[0].file.contentBase64).toBeUndefined();
  });

  it("writes local-reference package metadata when a managed asset file cannot be read", async () => {
    const { list } = await createMediaList();
    const deniedError = Object.assign(new Error("denied"), { code: "EACCES" });

    const artifact = await exportPackageArtifact(list, {
      appVersion: "0.1.0-test",
      assetRecords: new AssetRepository(db).list(),
      documentsPath: tempDir,
      fileSystem: {
        readFile: (async () => {
          throw deniedError;
        }) as typeof fsReadFile,
        stat: fsStat
      },
      userDataPath: tempDir
    });

    const packageData = JSON.parse(readFileSync(artifact.filePath, "utf8")) as {
      assets: Array<{ file: { byteSize: number; kind: string; managedPathExists: boolean; reason?: string; contentBase64?: string } }>;
    };

    expect(packageData.assets[0].file).toEqual(expect.objectContaining({
      byteSize: pngBytes.length,
      kind: "local-reference",
      managedPathExists: true,
      reason: "Managed asset file could not be read at package export time: EACCES."
    }));
    expect(packageData.assets[0].file.contentBase64).toBeUndefined();
  });

  it("reads embeddable package assets sequentially", async () => {
    const { assetRecords, list } = createPackageAssetFixture();
    let activeReads = 0;
    let maxActiveReads = 0;

    const artifact = await exportPackageArtifact(list, {
      appVersion: "0.1.0-test",
      assetRecords,
      documentsPath: tempDir,
      fileSystem: {
        readFile: (async (filePath) => {
          activeReads += 1;
          maxActiveReads = Math.max(maxActiveReads, activeReads);
          await new Promise((resolve) => setTimeout(resolve, 10));
          activeReads -= 1;
          return Buffer.from(String(filePath).includes("one") ? "one" : "two");
        }) as typeof fsReadFile,
        stat: (async () => ({ size: 3 } as Stats)) as typeof fsStat
      },
      maxTotalEmbeddedAssetBytes: 10,
      userDataPath: tempDir
    });

    const packageData = JSON.parse(readFileSync(artifact.filePath, "utf8")) as {
      assets: Array<{ file: { kind: string; contentBase64?: string } }>;
    };

    expect(maxActiveReads).toBe(1);
    expect(packageData.assets.map((asset) => asset.file.kind)).toEqual(["embedded", "embedded"]);
  });

  it("uses local references after the package total embed limit is reached", async () => {
    const { assetRecords, list } = createPackageAssetFixture();

    const artifact = await exportPackageArtifact(list, {
      appVersion: "0.1.0-test",
      assetRecords,
      documentsPath: tempDir,
      fileSystem: {
        readFile: (async (filePath) => Buffer.from(String(filePath).includes("one") ? "one" : "two")) as typeof fsReadFile,
        stat: (async () => ({ size: 3 } as Stats)) as typeof fsStat
      },
      maxTotalEmbeddedAssetBytes: 3,
      userDataPath: tempDir
    });

    const packageData = JSON.parse(readFileSync(artifact.filePath, "utf8")) as {
      assets: Array<{ file: { kind: string; reason?: string; contentBase64?: string } }>;
    };

    expect(packageData.assets[0].file).toEqual(expect.objectContaining({
      kind: "embedded",
      contentBase64: Buffer.from("one").toString("base64")
    }));
    expect(packageData.assets[1].file).toEqual(expect.objectContaining({
      kind: "local-reference",
      reason: "Managed asset file would exceed the package total embed limit."
    }));
    expect(packageData.assets[1].file.contentBase64).toBeUndefined();
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

const createMediaList = async () => {
  const imagePath = join(tempDir, "source pizza.png");
  writeFileSync(imagePath, pngBytes);

  const workspace = services.workspaces.create({ name: "Rankings" });
  const createdList = services.lists.create({ workspaceId: workspace.id, name: "Media Exports" });
  const [importedItem] = await services.items.importAssets(createdList.id, [imagePath]);
  const list = services.lists.get(createdList.id);
  if (!list) {
    throw new Error("Expected media export list.");
  }

  return {
    importedItem,
    list
  };
};

const createPackageAssetFixture = () => {
  const now = new Date().toISOString();
  const list: TierListDetail = {
    id: "list-package-assets",
    workspaceId: "workspace-1",
    name: "Package Assets",
    isArchived: false,
    style: {},
    createdAt: now,
    updatedAt: now,
    items: [
      {
        id: "item-one",
        listId: "list-package-assets",
        kind: "image",
        label: "One",
        assetId: "asset-one",
        metadata: {},
        style: {},
        createdAt: now,
        updatedAt: now
      },
      {
        id: "item-two",
        listId: "list-package-assets",
        kind: "image",
        label: "Two",
        assetId: "asset-two",
        metadata: {},
        style: {},
        createdAt: now,
        updatedAt: now
      }
    ]
  };
  const assetRecords: MediaAssetRecord[] = [
    createPackageAssetRecord({
      id: "asset-one",
      originalName: "one.png",
      sourcePath: join(tempDir, "source-one.png"),
      managedRelPath: "assets/one.png",
      createdAt: "2026-01-01T00:00:00.000Z"
    }),
    createPackageAssetRecord({
      id: "asset-two",
      originalName: "two.png",
      sourcePath: join(tempDir, "source-two.png"),
      managedRelPath: "assets/two.png",
      createdAt: "2026-01-01T00:00:01.000Z"
    })
  ];

  return { assetRecords, list };
};

const createPackageAssetRecord = (input: Pick<MediaAssetRecord, "id" | "originalName" | "sourcePath" | "managedRelPath" | "createdAt">): MediaAssetRecord => ({
  id: input.id,
  sha256: input.id,
  originalName: input.originalName,
  mimeType: "image/png",
  extension: ".png",
  byteSize: 3,
  width: null,
  height: null,
  durationMs: null,
  sourcePath: input.sourcePath,
  managedRelPath: input.managedRelPath,
  thumbRelPath: "",
  posterRelPath: "",
  metadata: {},
  createdAt: input.createdAt
});

const escapeJsonPath = (filePath: string) => filePath.replace(/\\/g, "\\\\");
