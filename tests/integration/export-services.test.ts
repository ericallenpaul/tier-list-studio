import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { exportCsvArtifact } from "../../src/main/services/export/exportCsvService.js";
import { exportPackageArtifact } from "../../src/main/services/export/exportPackageService.js";
import { closeDatabase, openDatabase, type SqliteDatabase } from "../../src/main/services/db/connection.js";
import { runMigrations } from "../../src/main/services/db/migrations.js";
import { createCoreListServices } from "../../src/main/services/lists/listService.js";

let tempDir: string;
let db: SqliteDatabase;
let services: ReturnType<typeof createCoreListServices>;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "tier-list-studio-exports-"));
  db = openDatabase({ filePath: join(tempDir, "exports.sqlite") });
  runMigrations(db);
  services = createCoreListServices(db);
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
