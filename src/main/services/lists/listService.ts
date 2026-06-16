import type { TierStudioServices } from "../../../shared/contracts/tierStudioApi.js";
import type { TierItem, TierItemKind, TierList, TierRow, Workspace } from "../../../shared/models/entities.js";
import type {
  ItemSearchInput,
  ItemUpdateInput,
  ListCreateInput,
  ListUpdateInput,
  RowInsertInput,
  RowUpdateInput,
  WorkspaceCreateInput,
  WorkspaceUpdateInput
} from "../../../shared/schemas/inputs.js";
import type { SqliteDatabase } from "../db/connection.js";
import {
  ItemRepository,
  ListRepository,
  PositionRepository,
  RowRepository,
  SearchRepository,
  WorkspaceRepository
} from "../repositories/index.js";
import type { ItemRecord, JsonObject, JsonValue, TierListRecord, TierRowRecord, WorkspaceRecord } from "../repositories/types.js";
import { createPositionService } from "../positions/positionService.js";

const defaultRows = [
  { label: "S", fillColor: "#ef4444", textColor: "#ffffff" },
  { label: "A", fillColor: "#f97316", textColor: "#111827" },
  { label: "B", fillColor: "#eab308", textColor: "#111827" },
  { label: "C", fillColor: "#22c55e", textColor: "#111827" },
  { label: "D", fillColor: "#3b82f6", textColor: "#ffffff" }
] as const;

export type CoreListServices = Pick<TierStudioServices, "workspaces" | "lists" | "rows" | "items" | "positions">;

export const createCoreListServices = (db: SqliteDatabase): CoreListServices => {
  const workspaces = new WorkspaceRepository(db);
  const lists = new ListRepository(db);
  const rows = new RowRepository(db);
  const items = new ItemRepository(db);
  const positions = new PositionRepository(db);
  const search = new SearchRepository(db);
  const positionService = createPositionService(db);

  const syncListSearch = (list: TierListRecord) => {
    search.replace({
      entityType: "list",
      entityId: list.id,
      title: list.title,
      body: [list.subtitle, list.description].filter(Boolean).join(" "),
      tags: list.categories.filter((category): category is string => typeof category === "string")
    });
  };

  const syncItemSearch = (item: ItemRecord) => {
    search.replace({
      entityType: "item",
      entityId: item.id,
      title: item.label,
      body: [item.subtitle, item.note].filter(Boolean).join(" "),
      tags: item.tags.filter((tag): tag is string => typeof tag === "string")
    });
  };

  const createList = (input: ListCreateInput) => {
    const created = db.transaction(() => {
      if (!workspaces.get(input.workspaceId)) {
        throw new Error(`Workspace not found: ${input.workspaceId}`);
      }

      const list = lists.create({
        workspaceId: input.workspaceId,
        title: input.name,
        description: input.description,
        slug: uniqueSlug(db, input.workspaceId, input.name)
      });

      defaultRows.forEach((row, index) => {
        rows.create({
          tierListId: list.id,
          sortOrder: index,
          label: row.label,
          fillColor: row.fillColor,
          textColor: row.textColor
        });
      });

      syncListSearch(list);
      return list;
    });

    return mapList(created());
  };

  const updateList = (id: string, patch: ListUpdateInput) => {
    const updated = db.transaction((): TierList => {
      const current = lists.get(id);
      if (!current) {
        throw new Error(`Tier list not found: ${id}`);
      }
      if (patch.isArchived) {
        for (const item of items.listByTierList(id)) {
          search.delete("item", item.id);
        }
        lists.delete(id);
        search.delete("list", id);
        return { ...mapList(current), isArchived: true, updatedAt: new Date().toISOString() };
      }

      const list = lists.update(id, {
        title: patch.name,
        description: patch.description,
        boardStyle: patch.style as JsonObject | undefined
      });
      syncListSearch(list);
      return mapList(list);
    });

    return updated();
  };

  const duplicateList = (id: string) => {
    const duplicated = db.transaction(() => {
      const source = lists.get(id);
      if (!source) {
        throw new Error(`Tier list not found: ${id}`);
      }

      const copy = lists.create({
        workspaceId: source.workspaceId,
        title: `${source.title} Remix`,
        subtitle: source.subtitle,
        description: source.description,
        slug: uniqueSlug(db, source.workspaceId, `${source.title} Remix`),
        categories: source.categories,
        boardStyle: source.boardStyle,
        tierStyle: source.tierStyle,
        itemStyle: source.itemStyle,
        interaction: source.interaction,
        presentation: source.presentation
      });

      const rowIdMap = new Map<string, string>();
      for (const sourceRow of rows.listByTierList(source.id)) {
        const copiedRow = rows.create({
          tierListId: copy.id,
          sortOrder: sourceRow.sortOrder,
          label: sourceRow.label,
          shortLabel: sourceRow.shortLabel,
          description: sourceRow.description,
          fillColor: sourceRow.fillColor,
          textColor: sourceRow.textColor,
          accentColor: sourceRow.accentColor,
          iconText: sourceRow.iconText,
          rowHeight: sourceRow.rowHeight,
          maxItems: sourceRow.maxItems,
          style: sourceRow.style
        });
        rowIdMap.set(sourceRow.id, copiedRow.id);
      }

      const itemIdMap = new Map<string, string>();
      for (const sourceItem of items.listByTierList(source.id)) {
        const copiedItem = items.create({
          tierListId: copy.id,
          sourceType: sourceItem.sourceType,
          label: sourceItem.label,
          subtitle: sourceItem.subtitle,
          note: sourceItem.note,
          tags: sourceItem.tags,
          assetId: sourceItem.assetId,
          style: sourceItem.style,
          metadata: sourceItem.metadata
        });
        itemIdMap.set(sourceItem.id, copiedItem.id);
        syncItemSearch(copiedItem);
      }

      for (const sourcePosition of positions.listByTierList(source.id)) {
        const copiedItemId = itemIdMap.get(sourcePosition.itemId);
        if (!copiedItemId) {
          continue;
        }
        positions.upsert({
          itemId: copiedItemId,
          tierListId: copy.id,
          containerType: sourcePosition.containerType,
          tierRowId: sourcePosition.tierRowId ? rowIdMap.get(sourcePosition.tierRowId) : null,
          sortOrder: sourcePosition.sortOrder
        });
      }

      syncListSearch(copy);
      return copy;
    });

    return mapList(duplicated());
  };

  const removeRow = (rowId: string) => {
    const remove = db.transaction(() => {
      const row = rows.get(rowId);
      if (!row) {
        throw new Error(`Tier row not found: ${rowId}`);
      }
      const maxPoolSortOrder = maxSortOrder(db, row.tierListId, null);
      positions.listByRow(rowId).forEach((position, index) => {
        positions.upsert({
          itemId: position.itemId,
          tierListId: row.tierListId,
          containerType: "pool",
          tierRowId: null,
          sortOrder: maxPoolSortOrder + index + 1
        });
      });
      rows.delete(rowId);
      positionService.normalize(row.tierListId);
    });
    remove();
  };

  return {
    workspaces: {
      list: () => workspaces.list().map(mapWorkspace),
      create: (input: WorkspaceCreateInput) => mapWorkspace(workspaces.create(input)),
      update: (id: string, patch: WorkspaceUpdateInput) => mapWorkspace(workspaces.update(id, { name: patch.name }))
    },
    lists: {
      list: (workspaceId: string) => lists.listByWorkspace(workspaceId).map(mapList),
      get: (id: string) => {
        const list = lists.get(id);
        return list ? mapList(list) : undefined;
      },
      create: createList,
      update: updateList,
      duplicate: duplicateList,
      archive: (id: string) => updateList(id, { isArchived: true })
    },
    rows: {
      insert: (listId: string, input: RowInsertInput) => {
        const inserted = db.transaction(() => {
          if (!lists.get(listId)) {
            throw new Error(`Tier list not found: ${listId}`);
          }
          const existingRows = rows.listByTierList(listId);
          const afterIndex = input.afterRowId ? existingRows.findIndex((row) => row.id === input.afterRowId) : existingRows.length - 1;
          if (input.afterRowId && afterIndex === -1) {
            throw new Error(`Tier row not found in tier list ${listId}: ${input.afterRowId}`);
          }
          const insertIndex = afterIndex + 1;
          rewriteRows(rows, listId, existingRows, 1000);
          existingRows.forEach((row, index) => {
            rows.update(row.id, { sortOrder: index >= insertIndex ? index + 1 : index });
          });
          return rows.create({
            tierListId: listId,
            sortOrder: insertIndex,
            label: input.label,
            fillColor: input.color,
            style: input.style as JsonObject | undefined
          });
        });
        return mapRow(inserted());
      },
      update: (rowId: string, patch: RowUpdateInput) => mapRow(rows.update(rowId, {
        label: patch.label,
        fillColor: patch.color,
        style: patch.style as JsonObject | undefined
      })),
      reorder: (listId: string, rowIdsInOrder: string[]) => {
        const reordered = db.transaction(() => {
          const existingRows = rows.listByTierList(listId);
          const existingIds = new Set(existingRows.map((row) => row.id));
          if (rowIdsInOrder.length !== existingRows.length || rowIdsInOrder.some((rowId) => !existingIds.has(rowId))) {
            throw new Error(`Row reorder payload must include every row in tier list ${listId}`);
          }
          rewriteRows(rows, listId, existingRows, 1000);
          rowIdsInOrder.forEach((rowId, index) => rows.update(rowId, { sortOrder: index }));
          return rows.listByTierList(listId);
        });
        return reordered().map(mapRow);
      },
      remove: removeRow
    },
    items: {
      addTextBatch: (listId: string, lines: string[]) => {
        const created = db.transaction(() => {
          if (!lists.get(listId)) {
            throw new Error(`Tier list not found: ${listId}`);
          }
          const cleanLines = lines.map((line) => line.trim()).filter(Boolean);
          const startOrder = maxSortOrder(db, listId, null) + 1;
          return cleanLines.map((line, index) => {
            const item = items.create({
              tierListId: listId,
              sourceType: "text",
              label: line
            });
            positions.upsert({
              itemId: item.id,
              tierListId: listId,
              containerType: "pool",
              tierRowId: null,
              sortOrder: startOrder + index
            });
            syncItemSearch(item);
            return item;
          });
        });
        return created().map(mapItem);
      },
      importAssets: () => {
        throw new Error("Asset import is not implemented yet.");
      },
      update: (itemId: string, patch: ItemUpdateInput) => {
        const updated = db.transaction(() => {
          const item = items.update(itemId, {
            label: patch.label,
            metadata: patch.metadata as JsonObject | undefined,
            style: patch.style as JsonObject | undefined
          });
          syncItemSearch(item);
          return item;
        });
        return mapItem(updated());
      },
      remove: (itemId: string) => {
        const item = items.get(itemId);
        items.delete(itemId);
        if (item) {
          search.delete("item", item.id);
        }
      },
      search: (query: ItemSearchInput) => {
        const listIdsForWorkspace = query.workspaceId
          ? new Set(lists.listByWorkspace(query.workspaceId).map((list) => list.id))
          : undefined;
        const resultIds = search.query(escapeFtsQuery(query.text), { entityType: "item", limit: 100 })
          .map((result) => result.entityId);

        return resultIds
          .map((id) => items.get(id))
          .filter((item): item is ItemRecord => Boolean(item))
          .filter((item) => !query.listId || item.tierListId === query.listId)
          .filter((item) => !listIdsForWorkspace || listIdsForWorkspace.has(item.tierListId))
          .filter((item) => !query.kinds || query.kinds.includes(mapSourceType(item.sourceType)))
          .map(mapItem);
      }
    },
    positions: positionService
  };
};

const mapWorkspace = (workspace: WorkspaceRecord): Workspace => ({
  id: workspace.id,
  name: workspace.name,
  createdAt: workspace.createdAt,
  updatedAt: workspace.updatedAt
});

const mapList = (list: TierListRecord): TierList => ({
  id: list.id,
  workspaceId: list.workspaceId,
  name: list.title,
  description: list.description,
  isArchived: false,
  style: list.boardStyle,
  createdAt: list.createdAt,
  updatedAt: list.updatedAt
});

const mapRow = (row: TierRowRecord): TierRow => ({
  id: row.id,
  listId: row.tierListId,
  label: row.label,
  color: row.fillColor,
  sortOrder: row.sortOrder,
  style: row.style,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

const mapItem = (item: ItemRecord): TierItem => ({
  id: item.id,
  listId: item.tierListId,
  kind: mapSourceType(item.sourceType),
  label: item.label,
  assetId: item.assetId ?? undefined,
  metadata: item.metadata,
  style: item.style,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt
});

const mapSourceType = (sourceType: ItemRecord["sourceType"]): TierItemKind => sourceType === "mixed" ? "file" : sourceType;

const slugify = (value: string) => {
  const slug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || "untitled";
};

const uniqueSlug = (db: SqliteDatabase, workspaceId: string, title: string) => {
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let suffix = 2;

  while (db.prepare("SELECT 1 FROM tier_lists WHERE workspace_id = ? AND slug = ?").get(workspaceId, slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
};

const maxSortOrder = (db: SqliteDatabase, listId: string, rowId: string | null) => {
  const row = rowId
    ? db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS maxSortOrder FROM item_positions WHERE tier_list_id = ? AND tier_row_id = ?").get(listId, rowId)
    : db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS maxSortOrder FROM item_positions WHERE tier_list_id = ? AND container_type = 'pool'").get(listId);

  return (row as { maxSortOrder: number }).maxSortOrder;
};

const rewriteRows = (rows: RowRepository, listId: string, currentRows: TierRowRecord[], offset: number) => {
  currentRows.forEach((row, index) => {
    rows.update(row.id, { sortOrder: offset + index });
  });
};

const escapeFtsQuery = (query: string) => `"${query.replace(/"/g, "\"\"")}"`;
