import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { closeDatabase, openDatabase, type SqliteDatabase } from "../../src/main/services/db/connection.js";
import { runMigrations } from "../../src/main/services/db/migrations.js";
import { createCoreListServices } from "../../src/main/services/lists/listService.js";
import { AssetRepository, PositionRepository } from "../../src/main/services/repositories/index.js";

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
  it("copies image and video files into managed assets and creates pool items", () => {
    const imagePath = join(tempDir, "source pizza.png");
    const videoPath = join(tempDir, "clip tacos.mp4");
    writeFileSync(imagePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    writeFileSync(videoPath, Buffer.from("fake video"));

    const workspace = services.workspaces.create({ name: "Rankings" });
    const list = services.lists.create({ workspaceId: workspace.id, name: "Media Items" });
    const imported = services.items.importAssets(list.id, [imagePath, videoPath]);

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
});
