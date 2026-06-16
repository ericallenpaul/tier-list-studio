import { BaseRepository } from "./baseRepository.js";
import type { ContainerType, ItemPositionRecord } from "./types.js";

interface ItemPositionRow {
  item_id: string;
  tier_list_id: string;
  container_type: ContainerType;
  tier_row_id: string | null;
  sort_order: number;
  updated_at: string;
}

export interface UpsertItemPositionInput {
  itemId: string;
  tierListId: string;
  containerType: ContainerType;
  tierRowId?: string | null;
  sortOrder: number;
}

export class PositionRepository extends BaseRepository {
  upsert(input: UpsertItemPositionInput): ItemPositionRecord {
    this.db.prepare(`
      INSERT INTO item_positions (item_id, tier_list_id, container_type, tier_row_id, sort_order, updated_at)
      VALUES (@itemId, @tierListId, @containerType, @tierRowId, @sortOrder, @updatedAt)
      ON CONFLICT(item_id) DO UPDATE SET
        tier_list_id = excluded.tier_list_id,
        container_type = excluded.container_type,
        tier_row_id = excluded.tier_row_id,
        sort_order = excluded.sort_order,
        updated_at = excluded.updated_at
    `).run({
      itemId: input.itemId,
      tierListId: input.tierListId,
      containerType: input.containerType,
      tierRowId: input.tierRowId ?? null,
      sortOrder: input.sortOrder,
      updatedAt: this.now()
    });
    return this.get(input.itemId)!;
  }

  get(itemId: string): ItemPositionRecord | undefined {
    const row = this.db.prepare("SELECT * FROM item_positions WHERE item_id = ?").get(itemId) as ItemPositionRow | undefined;
    return row ? this.map(row) : undefined;
  }

  listByTierList(tierListId: string): ItemPositionRecord[] {
    return (this.db.prepare("SELECT * FROM item_positions WHERE tier_list_id = ? ORDER BY container_type, sort_order").all(tierListId) as ItemPositionRow[])
      .map((row) => this.map(row));
  }

  listByRow(tierRowId: string): ItemPositionRecord[] {
    return (this.db.prepare("SELECT * FROM item_positions WHERE tier_row_id = ? ORDER BY sort_order").all(tierRowId) as ItemPositionRow[])
      .map((row) => this.map(row));
  }

  delete(itemId: string) {
    this.db.prepare("DELETE FROM item_positions WHERE item_id = ?").run(itemId);
  }

  private map(row: ItemPositionRow): ItemPositionRecord {
    return {
      itemId: row.item_id,
      tierListId: row.tier_list_id,
      containerType: row.container_type,
      tierRowId: row.tier_row_id,
      sortOrder: row.sort_order,
      updatedAt: row.updated_at
    };
  }
}
