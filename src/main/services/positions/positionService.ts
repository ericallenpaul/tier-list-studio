import type { TierPosition } from "../../../shared/models/entities.js";
import type { PositionMoveInput } from "../../../shared/schemas/inputs.js";
import type { SqliteDatabase } from "../db/connection.js";
import { ListRepository, PositionRepository, RowRepository } from "../repositories/index.js";
import type { ItemPositionRecord } from "../repositories/types.js";

type ContainerKey = string | null;

export interface PositionService {
  move(input: PositionMoveInput): TierPosition[];
  normalize(listId: string): TierPosition[];
}

export const createPositionService = (db: SqliteDatabase): PositionService => {
  const lists = new ListRepository(db);
  const rows = new RowRepository(db);
  const positions = new PositionRepository(db);

  const normalizeContainer = (listId: string, key: ContainerKey) => {
    const existing = listPositionsForContainer(db, listId, key)
      .sort(comparePositions);

    existing.forEach((position, index) => {
      positions.upsert({
        itemId: position.itemId,
        tierListId: listId,
        containerType: key === null ? "pool" : "tier",
        tierRowId: key,
        sortOrder: index
      });
    });
  };

  const normalizeList = (listId: string) => {
    if (!lists.get(listId)) {
      throw new Error(`Tier list not found: ${listId}`);
    }

    const normalize = db.transaction(() => {
      normalizeContainer(listId, null);
      for (const row of rows.listByTierList(listId)) {
        normalizeContainer(listId, row.id);
      }
    });
    normalize();

    return mapPositions(positions.listByTierList(listId));
  };

  return {
    move(input) {
      const moved = db.transaction(() => {
        if (!lists.get(input.listId)) {
          throw new Error(`Tier list not found: ${input.listId}`);
        }

        const targetKey = input.targetRowId;
        if (targetKey !== null) {
          const targetRow = rows.get(targetKey);
          if (!targetRow || targetRow.tierListId !== input.listId) {
            throw new Error(`Target row not found in tier list ${input.listId}: ${targetKey}`);
          }
        }

        const uniqueItemIds = Array.from(new Set(input.itemIds));
        const selected = uniqueItemIds.map((itemId) => {
          const item = db.prepare("SELECT tier_list_id FROM items WHERE id = ?").get(itemId) as { tier_list_id: string } | undefined;
          if (!item) {
            throw new Error(`Item not found: ${itemId}`);
          }
          if (item.tier_list_id !== input.listId) {
            throw new Error(`Item ${itemId} belongs to ${item.tier_list_id}, not ${input.listId}`);
          }
          return itemId;
        });

        const existing = positions.listByTierList(input.listId);
        const byContainer = new Map<ContainerKey, ItemPositionRecord[]>();
        for (const position of existing) {
          const key = containerKey(position);
          const bucket = byContainer.get(key) ?? [];
          bucket.push(position);
          byContainer.set(key, bucket);
        }

        const affected = new Set<ContainerKey>([targetKey]);
        for (const [key, bucket] of byContainer) {
          const kept = bucket
            .filter((position) => {
              const shouldKeep = !selected.includes(position.itemId);
              if (!shouldKeep) {
                affected.add(key);
              }
              return shouldKeep;
            })
            .sort(comparePositions);
          byContainer.set(key, kept);
        }

        const target = byContainer.get(targetKey) ?? [];
        const insertAt = Math.min(input.targetIndex, target.length);
        target.splice(
          insertAt,
          0,
          ...selected.map((itemId, offset) => ({
            itemId,
            tierListId: input.listId,
            containerType: targetKey === null ? "pool" as const : "tier" as const,
            tierRowId: targetKey,
            sortOrder: insertAt + offset,
            updatedAt: new Date().toISOString()
          }))
        );
        byContainer.set(targetKey, target);

        for (const key of affected) {
          const bucket = (byContainer.get(key) ?? []).sort(comparePositions);
          bucket.forEach((position, index) => {
            positions.upsert({
              itemId: position.itemId,
              tierListId: input.listId,
              containerType: key === null ? "pool" : "tier",
              tierRowId: key,
              sortOrder: index
            });
          });
        }
      });

      moved();
      return mapPositions(positions.listByTierList(input.listId));
    },
    normalize: normalizeList
  };
};

export const mapPosition = (position: ItemPositionRecord): TierPosition => ({
  id: position.itemId,
  listId: position.tierListId,
  rowId: position.tierRowId,
  itemId: position.itemId,
  sortOrder: position.sortOrder,
  createdAt: position.updatedAt,
  updatedAt: position.updatedAt
});

export const mapPositions = (records: ItemPositionRecord[]) => records.map(mapPosition);

const listPositionsForContainer = (db: SqliteDatabase, listId: string, key: ContainerKey) => {
  const rows = key === null
    ? db.prepare(`
        SELECT item_id, tier_list_id, container_type, tier_row_id, sort_order, updated_at
        FROM item_positions
        WHERE tier_list_id = ? AND container_type = 'pool'
        ORDER BY sort_order, item_id
      `).all(listId)
    : db.prepare(`
        SELECT item_id, tier_list_id, container_type, tier_row_id, sort_order, updated_at
        FROM item_positions
        WHERE tier_list_id = ? AND tier_row_id = ?
        ORDER BY sort_order, item_id
      `).all(listId, key);

  return (rows as Array<{
    item_id: string;
    tier_list_id: string;
    container_type: ItemPositionRecord["containerType"];
    tier_row_id: string | null;
    sort_order: number;
    updated_at: string;
  }>).map((row) => ({
    itemId: row.item_id,
    tierListId: row.tier_list_id,
    containerType: row.container_type,
    tierRowId: row.tier_row_id,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at
  }));
};

const containerKey = (position: ItemPositionRecord): ContainerKey => position.tierRowId;

const comparePositions = (first: ItemPositionRecord, second: ItemPositionRecord) =>
  first.sortOrder - second.sortOrder || first.itemId.localeCompare(second.itemId);
