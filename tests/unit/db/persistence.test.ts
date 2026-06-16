import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { closeDatabase, openDatabase, type SqliteDatabase } from "../../../src/main/services/db/connection.js";
import { runMigrations, seedDatabase } from "../../../src/main/services/db/migrations.js";
import {
  AssetRepository,
  ExportHistoryRepository,
  ItemRepository,
  ListRepository,
  PositionRepository,
  RowRepository,
  SearchRepository,
  SettingsRepository,
  SnapshotRepository,
  TemplateRepository,
  WorkspaceRepository
} from "../../../src/main/services/repositories/index.js";

let tempDir: string;
let db: SqliteDatabase;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "tier-list-studio-db-"));
  db = openDatabase({ filePath: join(tempDir, "test.sqlite") });
  runMigrations(db);
});

afterEach(() => {
  closeDatabase(db);
  rmSync(tempDir, { recursive: true, force: true });
});

describe("SQLite connection and migrations", () => {
  it("opens with required pragmas", () => {
    expect((db.pragma("foreign_keys") as Array<{ foreign_keys: number }>)[0].foreign_keys).toBe(1);
    expect((db.pragma("journal_mode") as Array<{ journal_mode: string }>)[0].journal_mode).toBe("wal");
    expect((db.pragma("busy_timeout") as Array<{ timeout: number }>)[0].timeout).toBe(5000);
  });

  it("creates the schema tables, indexes, and FTS table", () => {
    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type IN ('table', 'virtual table') AND name NOT LIKE 'search_index_%'
      ORDER BY name
    `).all() as Array<{ name: string }>;
    expect(tables.map((row) => row.name)).toEqual(expect.arrayContaining([
      "app_settings",
      "export_history",
      "item_positions",
      "items",
      "media_assets",
      "schema_migrations",
      "search_index",
      "snapshots",
      "templates",
      "tier_lists",
      "tier_rows",
      "workspaces"
    ]));

    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' ORDER BY name").all() as Array<{ name: string }>;
    expect(indexes.map((row) => row.name)).toEqual(expect.arrayContaining([
      "idx_assets_sha",
      "idx_items_list_updated",
      "idx_lists_workspace_updated",
      "idx_positions_row_order",
      "idx_rows_list_order"
    ]));
  });

  it("runs seeds idempotently without duplicating built-ins", () => {
    seedDatabase(db);
    seedDatabase(db);

    expect(db.prepare("SELECT COUNT(*) AS count FROM workspaces WHERE id = 'workspace-default'").get()).toEqual({ count: 1 });
    expect(db.prepare("SELECT COUNT(*) AS count FROM templates WHERE built_in = 1").get()).toEqual({ count: 2 });
    expect(db.prepare("SELECT COUNT(*) AS count FROM app_settings WHERE key = 'defaultWorkspaceId'").get()).toEqual({ count: 1 });
  });

  it("rejects invalid JSON in constrained columns", () => {
    expect(() => {
      db.prepare(`
        INSERT INTO app_settings (key, value_json, updated_at)
        VALUES ('broken', '{not-json', '2026-01-01T00:00:00.000Z')
      `).run();
    }).toThrow();
  });

  it("surfaces invalid persisted JSON when reading existing corrupted data", () => {
    db.pragma("ignore_check_constraints = ON");
    db.prepare(`
      INSERT INTO app_settings (key, value_json, updated_at)
      VALUES ('legacy-broken', '{not-json', '2026-01-01T00:00:00.000Z')
    `).run();
    db.pragma("ignore_check_constraints = OFF");

    const settings = new SettingsRepository(db);
    expect(() => settings.get("legacy-broken")).toThrow(/Invalid persisted JSON in app_settings.value_json/);
  });

  it("opens an existing database readonly without mutating WAL mode", () => {
    closeDatabase(db);
    db = openDatabase({ filePath: join(tempDir, "test.sqlite"), readonly: true });

    expect((db.pragma("foreign_keys") as Array<{ foreign_keys: number }>)[0].foreign_keys).toBe(1);
    expect((db.pragma("busy_timeout") as Array<{ timeout: number }>)[0].timeout).toBe(5000);
    expect(db.prepare("SELECT COUNT(*) AS count FROM workspaces").get()).toEqual({ count: 1 });
  });
});

describe("repositories", () => {
  it("supports workspace CRUD basics", () => {
    const workspaces = new WorkspaceRepository(db);
    const created = workspaces.create({ name: "Studio", description: "Personal lists", theme: { accentColor: "#0f766e" } });
    const updated = workspaces.update(created.id, { name: "Studio Updated" });

    expect(updated.name).toBe("Studio Updated");
    expect(workspaces.list().some((workspace) => workspace.id === created.id)).toBe(true);

    workspaces.delete(created.id);
    expect(workspaces.get(created.id)).toBeUndefined();
  });

  it("creates lists, rows, items, positions, snapshots, exports, and cascades list-owned rows", () => {
    const lists = new ListRepository(db);
    const rows = new RowRepository(db);
    const items = new ItemRepository(db);
    const positions = new PositionRepository(db);
    const snapshots = new SnapshotRepository(db);
    const exports = new ExportHistoryRepository(db);

    const list = lists.create({ workspaceId: "workspace-default", title: "Games", slug: "games", categories: ["media"] });
    const row = rows.create({ tierListId: list.id, sortOrder: 1, label: "S", fillColor: "#ef4444", textColor: "#ffffff" });
    const item = items.create({ tierListId: list.id, sourceType: "text", label: "Chess", tags: ["classic"] });
    const position = positions.upsert({ itemId: item.id, tierListId: list.id, containerType: "tier", tierRowId: row.id, sortOrder: 1 });
    const snapshot = snapshots.create({ tierListId: list.id, label: "Initial", state: { listId: list.id } });
    const exportRecord = exports.create({ tierListId: list.id, exportKind: "png", outputPath: "C:/tmp/games.png", options: { scale: 2 } });

    expect(lists.listByWorkspace("workspace-default")).toContainEqual(expect.objectContaining({ id: list.id, title: "Games" }));
    expect(rows.listByTierList(list.id)).toHaveLength(1);
    expect(items.listByTierList(list.id)).toHaveLength(1);
    expect(position.tierRowId).toBe(row.id);
    expect(snapshot.state).toEqual({ listId: list.id });
    expect(exportRecord.options).toEqual({ scale: 2 });

    lists.delete(list.id);
    expect(rows.get(row.id)).toBeUndefined();
    expect(items.get(item.id)).toBeUndefined();
    expect(positions.get(item.id)).toBeUndefined();
  });

  it("rejects item positions that cross tier lists", () => {
    const lists = new ListRepository(db);
    const rows = new RowRepository(db);
    const items = new ItemRepository(db);
    const positions = new PositionRepository(db);

    const firstList = lists.create({ workspaceId: "workspace-default", title: "First", slug: "first" });
    const secondList = lists.create({ workspaceId: "workspace-default", title: "Second", slug: "second" });
    const firstItem = items.create({ tierListId: firstList.id, sourceType: "text", label: "First item" });
    const firstRow = rows.create({ tierListId: firstList.id, sortOrder: 1, label: "A", fillColor: "#22c55e" });
    const secondRow = rows.create({ tierListId: secondList.id, sortOrder: 1, label: "B", fillColor: "#3b82f6" });

    expect(() => positions.upsert({
      itemId: firstItem.id,
      tierListId: secondList.id,
      containerType: "pool",
      sortOrder: 1
    })).toThrow(/item belongs to/);

    expect(() => positions.upsert({
      itemId: firstItem.id,
      tierListId: firstList.id,
      containerType: "tier",
      tierRowId: secondRow.id,
      sortOrder: 1
    })).toThrow(/row belongs to/);

    expect(positions.upsert({
      itemId: firstItem.id,
      tierListId: firstList.id,
      containerType: "tier",
      tierRowId: firstRow.id,
      sortOrder: 1
    }).tierRowId).toBe(firstRow.id);
  });

  it("enforces media asset sha uniqueness and can find by sha", () => {
    const assets = new AssetRepository(db);
    const asset = assets.create({
      sha256: "abc123",
      originalName: "image.png",
      mimeType: "image/png",
      extension: ".png",
      byteSize: 42,
      width: 16,
      height: 16,
      sourcePath: "C:/source/image.png",
      managedRelPath: "assets/abc123.png"
    });

    expect(assets.findBySha256("abc123")?.id).toBe(asset.id);
    expect(() => assets.create({
      sha256: "abc123",
      originalName: "duplicate.png",
      mimeType: "image/png",
      extension: ".png",
      byteSize: 1,
      sourcePath: "C:/source/duplicate.png",
      managedRelPath: "assets/duplicate.png"
    })).toThrow();
  });

  it("lists built-in templates and supports custom templates", () => {
    const templates = new TemplateRepository(db);
    const builtIns = templates.list().filter((template) => template.builtIn);
    const custom = templates.create({ name: "Custom", definition: { rows: [] } });

    expect(builtIns.map((template) => template.id)).toEqual(expect.arrayContaining([
      "template-classic-ranking",
      "template-simple-priority"
    ]));
    expect(templates.get(custom.id)?.builtIn).toBe(false);
  });

  it("stores settings JSON values", () => {
    const settings = new SettingsRepository(db);
    const setting = settings.set("windowBounds", { width: 1200, height: 800 });

    expect(setting.value).toEqual({ width: 1200, height: 800 });
    expect(settings.get("windowBounds")?.value).toEqual({ width: 1200, height: 800 });
  });

  it("replaces and queries FTS search rows", () => {
    const search = new SearchRepository(db);
    search.replace({
      entityType: "item",
      entityId: "item-1",
      title: "Instant Noodles",
      body: "Quick pantry meal",
      tags: ["food", "budget"]
    });
    search.replace({
      entityType: "item",
      entityId: "item-1",
      title: "Ramen",
      body: "Noodle soup",
      tags: ["food"]
    });

    const results = search.query("ramen");
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(expect.objectContaining({ entityId: "item-1", title: "Ramen" }));
  });
});
