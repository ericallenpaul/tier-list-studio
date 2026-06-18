import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  dialog: {
    showOpenDialog: vi.fn()
  }
}));

import { dialog } from "electron";

import { registerHandlers, type IpcMainLike } from "../../src/main/ipc/registerHandlers.js";
import { closeDatabase, openDatabase, type SqliteDatabase } from "../../src/main/services/db/connection.js";
import { runMigrations } from "../../src/main/services/db/migrations.js";
import { createCoreListServices } from "../../src/main/services/lists/listService.js";
import { RowRepository } from "../../src/main/services/repositories/index.js";
import { createTierStudioApi } from "../../src/preload/api.cjs";
import { mapTierListToBoard } from "../../src/renderer/domain/editorMappers.js";
import { tierStudioChannels, type TierStudioChannel } from "../../src/preload/channelTypes.cjs";
import type { AppPaths, TierStudioServices } from "../../src/shared/contracts/tierStudioApi.js";

class FakeIpcMain implements IpcMainLike {
  private readonly handlers = new Map<string, (event: unknown, payload?: unknown) => unknown>();

  handle(channel: string, listener: (event: unknown, payload?: unknown) => unknown) {
    this.handlers.set(channel, listener);
  }

  invoke(channel: TierStudioChannel, payload?: unknown, event: unknown = { sender: "test" }) {
    const handler = this.handlers.get(channel);
    if (!handler) {
      throw new Error(`Missing handler: ${channel}`);
    }
    return Promise.resolve(handler(event, payload));
  }
}

let tempDir: string;
let dbPath: string;
let db: SqliteDatabase;
let services: ReturnType<typeof createCoreListServices>;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "tier-list-studio-core-"));
  dbPath = join(tempDir, "core.sqlite");
  db = openDatabase({ filePath: dbPath });
  runMigrations(db);
  services = createCoreListServices(db);
});

afterEach(async () => {
  vi.restoreAllMocks();
  if (db.open) {
    closeDatabase(db);
  }
  await new Promise((resolve) => setTimeout(resolve, 100));
  rmSync(tempDir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
});

describe("core list services and IPC", () => {
  it("creates a list, adds text items, moves them to a tier, duplicates, searches, and reopens from DB", async () => {
    const ipcMain = new FakeIpcMain();
    const paths: AppPaths = {
      userData: tempDir,
      documents: tempDir,
      temp: tempDir
    };
    registerHandlers(
      ipcMain,
      {
        getVersion: () => "0.1.0-test",
        getPath: (name) => paths[name as keyof AppPaths]
      },
      { services: services as Partial<TierStudioServices> }
    );
    const api = createTierStudioApi((channel, payload) => ipcMain.invoke(channel, payload));

    const workspace = await api.workspaces.create({ name: "Rankings" });
    const list = await api.lists.create({
      workspaceId: workspace.id,
      name: "Launch Snacks",
      description: "Foods for release week"
    });

    expect(list).toEqual(expect.objectContaining({
      workspaceId: workspace.id,
      name: "Launch Snacks",
      isArchived: false
    }));

    const rows = new RowRepository(db).listByTierList(list.id);
    expect(rows.map((row) => row.label)).toEqual(["S", "A", "B", "C", "D"]);
    expect(() => api.rows.reorder(list.id, [rows[0].id, rows[0].id, rows[2].id, rows[3].id, rows[4].id]))
      .toThrow();

    const items = await api.items.addTextBatch(list.id, ["Ramen", "  ", "Coffee", "Pizza"]);
    expect(items.map((item) => item.label)).toEqual(["Ramen", "Coffee", "Pizza"]);

    const moved = await api.positions.move({
      listId: list.id,
      itemIds: [items[1].id, items[0].id],
      targetRowId: rows[0].id,
      targetIndex: 0
    });
    expect(moved.filter((position) => position.rowId === rows[0].id).map((position) => position.itemId)).toEqual([
      items[1].id,
      items[0].id
    ]);
    expect(moved.filter((position) => position.rowId === null).map((position) => position.itemId)).toEqual([items[2].id]);

    const duplicated = await api.lists.duplicate(list.id);
    expect(duplicated).toEqual(expect.objectContaining({
      workspaceId: workspace.id,
      name: "Launch Snacks Remix"
    }));
    expect(new RowRepository(db).listByTierList(duplicated.id).map((row) => row.label)).toEqual(["S", "A", "B", "C", "D"]);

    const searchResults = await api.items.search({ text: "ramen", listId: list.id });
    expect(searchResults.map((item) => item.id)).toEqual([items[0].id]);

    closeDatabase(db);
    db = openDatabase({ filePath: dbPath });
    runMigrations(db);
    services = createCoreListServices(db);

    const reopenedList = services.lists.get(list.id);
    expect(reopenedList).toEqual(expect.objectContaining({ id: list.id, name: "Launch Snacks" }));
    expect(reopenedList?.rows?.map((row) => row.label)).toEqual(["S", "A", "B", "C", "D"]);
    expect(reopenedList?.positions?.map((position) => position.itemId)).toEqual([items[2].id, items[1].id, items[0].id]);

    const reopenedBoard = mapTierListToBoard(reopenedList!);
    expect(reopenedBoard.items.filter((item) => item.container === "pool").map((item) => item.label)).toEqual(["Pizza"]);
    expect(reopenedBoard.items.filter((item) => item.container === rows[0].id).map((item) => item.label)).toEqual([
      "Coffee",
      "Ramen"
    ]);

    const reopenedSearch = services.items.search({ text: "coffee", listId: list.id });
    expect(reopenedSearch.map((item) => item.id)).toEqual([items[1].id]);

    const reopenedPositions = services.positions.normalize(list.id);
    expect(reopenedPositions.filter((position) => position.rowId === rows[0].id).map((position) => position.itemId)).toEqual([
      items[1].id,
      items[0].id
    ]);
    expect(reopenedPositions.filter((position) => position.rowId === null).map((position) => position.itemId)).toEqual([items[2].id]);
  });

  it("searches punctuation and hyphenated item labels without FTS syntax errors", () => {
    const workspace = services.workspaces.create({ name: "Search" });
    const list = services.lists.create({
      workspaceId: workspace.id,
      name: "Punctuation Search"
    });
    services.items.addTextBatch(list.id, ["Pizza-1", "foo-bar", "Plain Toast"]);

    expect(services.items.search({ text: "Pizza-1", listId: list.id }).map((item) => item.label)).toEqual(["Pizza-1"]);
    expect(services.items.search({ text: "foo-bar", listId: list.id }).map((item) => item.label)).toEqual(["foo-bar"]);
    expect(services.items.search({ text: "foo-", listId: list.id }).map((item) => item.label)).toEqual(["foo-bar"]);
    expect(services.items.search({ text: "!!!", listId: list.id })).toEqual([]);
  });

  it("rejects ungranted IPC asset imports before reaching core services", async () => {
    const ipcMain = new FakeIpcMain();
    const paths: AppPaths = {
      userData: tempDir,
      documents: tempDir,
      temp: tempDir
    };
    registerHandlers(
      ipcMain,
      {
        getVersion: () => "0.1.0-test",
        getPath: (name) => paths[name as keyof AppPaths]
      },
      { services: services as Partial<TierStudioServices> }
    );
    const api = createTierStudioApi((channel, payload) => ipcMain.invoke(channel, payload));

    await expect(Promise.resolve().then(() => api.items.importAssets("list-1", [join(tempDir, "unpicked.png")])))
      .rejects.toThrow(/file picker/i);
  });

  it("scopes dialog file grants to the sender that opened the picker", async () => {
    const ipcMain = new FakeIpcMain();
    const pickedPath = join(tempDir, "picked.png");
    const importAssets = vi.fn(async () => []);
    vi.spyOn(dialog, "showOpenDialog").mockResolvedValue({
      canceled: false,
      filePaths: [pickedPath]
    });

    registerHandlers(
      ipcMain,
      {
        getVersion: () => "0.1.0-test",
        getPath: () => tempDir
      },
      { services: { items: { importAssets } } as Partial<TierStudioServices> }
    );

    await ipcMain.invoke(
      tierStudioChannels.dialogs.openFiles,
      { multiple: false },
      { sender: { id: 1 } }
    );

    await expect(Promise.resolve().then(() => ipcMain.invoke(
      tierStudioChannels.items.importAssets,
      { listId: "list-1", filePaths: [pickedPath] },
      { sender: { id: 2 } }
    ))).rejects.toThrow(/file picker/i);
    expect(importAssets).not.toHaveBeenCalled();

    await expect(ipcMain.invoke(
      tierStudioChannels.items.importAssets,
      { listId: "list-1", filePaths: [pickedPath] },
      { sender: { id: 1 } }
    )).resolves.toEqual([]);
    expect(importAssets).toHaveBeenCalledWith("list-1", [pickedPath]);
  });
});
