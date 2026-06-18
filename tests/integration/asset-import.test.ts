import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { closeDatabase, openDatabase, type SqliteDatabase } from "../../src/main/services/db/connection.js";
import { runMigrations } from "../../src/main/services/db/migrations.js";
import { createCoreListServices } from "../../src/main/services/lists/listService.js";
import { AssetRepository, PositionRepository } from "../../src/main/services/repositories/index.js";

const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const mp4Bytes = Buffer.from([
  0x00, 0x00, 0x00, 0x18,
  0x66, 0x74, 0x79, 0x70,
  0x69, 0x73, 0x6f, 0x6d,
  0x00, 0x00, 0x02, 0x00,
  0x69, 0x73, 0x6f, 0x6d,
  0x69, 0x73, 0x6f, 0x32
]);

let tempDir: string;
let db: SqliteDatabase;
let services: ReturnType<typeof createCoreListServices>;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "tier-list-studio-assets-"));
  db = openDatabase({ filePath: join(tempDir, "assets.sqlite") });
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

describe("asset import", () => {
  it("copies image and video files into managed assets and creates pool items", async () => {
    const imagePath = join(tempDir, "source pizza.png");
    const videoPath = join(tempDir, "clip tacos.mp4");
    writeFileSync(imagePath, pngBytes);
    writeFileSync(videoPath, mp4Bytes);

    const workspace = services.workspaces.create({ name: "Rankings" });
    const list = services.lists.create({ workspaceId: workspace.id, name: "Media Items" });
    const imported = await services.items.importAssets(list.id, [imagePath, videoPath]);

    expect(imported.map((item) => ({ kind: item.kind, label: item.label }))).toEqual([
      { kind: "image", label: "source pizza" },
      { kind: "video", label: "clip tacos" }
    ]);

    const assets = new AssetRepository(db).list();
    expect(assets).toHaveLength(2);
    expect(assets.map((asset) => asset.originalName).sort()).toEqual(["clip tacos.mp4", "source pizza.png"]);
    for (const asset of assets) {
      expect(existsSync(join(tempDir, asset.managedRelPath))).toBe(true);
      expect(basename(asset.managedRelPath)).toMatch(/^[a-f0-9]{64}\.[a-z0-9]+$/);
    }

    const positions = new PositionRepository(db).listByTierList(list.id);
    expect(positions.map((position) => position.itemId)).toEqual(imported.map((item) => item.id));
    expect(positions.every((position) => position.containerType === "pool" && position.tierRowId === null)).toBe(true);
  });

  it("reuses one asset record for duplicate file imports while creating ordered items", async () => {
    const imagePath = join(tempDir, "duplicate pizza.png");
    writeFileSync(imagePath, pngBytes);

    const workspace = services.workspaces.create({ name: "Rankings" });
    const list = services.lists.create({ workspaceId: workspace.id, name: "Duplicate Media" });
    const imported = await services.items.importAssets(list.id, [imagePath, imagePath]);

    expect(imported).toHaveLength(2);
    expect(imported[0].assetId).toBe(imported[1].assetId);
    expect(new AssetRepository(db).list()).toHaveLength(1);

    const positions = new PositionRepository(db).listByTierList(list.id);
    expect(positions.map((position) => position.itemId)).toEqual(imported.map((item) => item.id));
    expect(positions.map((position) => position.sortOrder)).toEqual([0, 1]);
  });

  it("rejects fake media content before creating asset records", async () => {
    const fakeImagePath = join(tempDir, "not really.png");
    writeFileSync(fakeImagePath, Buffer.from("this is plain text"));

    const workspace = services.workspaces.create({ name: "Rankings" });
    const list = services.lists.create({ workspaceId: workspace.id, name: "Fake Media" });

    await expect(services.items.importAssets(list.id, [fakeImagePath])).rejects.toThrow(/invalid media file content/i);
    expect(new AssetRepository(db).list()).toHaveLength(0);
  });
});
