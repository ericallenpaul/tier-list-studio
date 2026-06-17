import { BaseRepository } from "./baseRepository.js";
import type { ItemRecord, JsonObject, JsonValue, SourceType } from "./types.js";

interface ItemRow {
  id: string;
  tier_list_id: string;
  source_type: SourceType;
  label: string;
  subtitle: string;
  note: string;
  tags_json: string;
  asset_id: string | null;
  style_json: string;
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

export interface CreateItemInput {
  id?: string;
  tierListId: string;
  sourceType: SourceType;
  label: string;
  subtitle?: string;
  note?: string;
  tags?: JsonValue[];
  assetId?: string | null;
  style?: JsonObject;
  metadata?: JsonObject;
}

export class ItemRepository extends BaseRepository {
  create(input: CreateItemInput): ItemRecord {
    const now = this.now();
    const id = input.id ?? this.id();
    this.db.prepare(`
      INSERT INTO items (
        id, tier_list_id, source_type, label, subtitle, note, tags_json, asset_id,
        style_json, metadata_json, created_at, updated_at
      )
      VALUES (
        @id, @tierListId, @sourceType, @label, @subtitle, @note, @tagsJson, @assetId,
        @styleJson, @metadataJson, @createdAt, @updatedAt
      )
    `).run({
      id,
      tierListId: input.tierListId,
      sourceType: input.sourceType,
      label: input.label,
      subtitle: input.subtitle ?? "",
      note: input.note ?? "",
      tagsJson: this.stringify(input.tags, []),
      assetId: input.assetId ?? null,
      styleJson: this.stringify(input.style, {}),
      metadataJson: this.stringify(input.metadata, {}),
      createdAt: now,
      updatedAt: now
    });
    return this.get(id)!;
  }

  get(id: string): ItemRecord | undefined {
    const row = this.db.prepare("SELECT * FROM items WHERE id = ?").get(id) as ItemRow | undefined;
    return row ? this.map(row) : undefined;
  }

  listByTierList(tierListId: string): ItemRecord[] {
    return (this.db.prepare("SELECT * FROM items WHERE tier_list_id = ? ORDER BY updated_at DESC").all(tierListId) as ItemRow[])
      .map((row) => this.map(row));
  }

  update(id: string, patch: Partial<Omit<CreateItemInput, "id" | "tierListId">>): ItemRecord {
    const current = this.get(id);
    if (!current) {
      throw new Error(`Item not found: ${id}`);
    }

    this.db.prepare(`
      UPDATE items
      SET source_type = @sourceType,
          label = @label,
          subtitle = @subtitle,
          note = @note,
          tags_json = @tagsJson,
          asset_id = @assetId,
          style_json = @styleJson,
          metadata_json = @metadataJson,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      sourceType: patch.sourceType ?? current.sourceType,
      label: patch.label ?? current.label,
      subtitle: patch.subtitle ?? current.subtitle,
      note: patch.note ?? current.note,
      tagsJson: this.stringify(patch.tags ?? current.tags, []),
      assetId: patch.assetId === undefined ? current.assetId : patch.assetId,
      styleJson: this.stringify(patch.style ?? current.style, {}),
      metadataJson: this.stringify(patch.metadata ?? current.metadata, {}),
      updatedAt: this.now()
    });
    return this.get(id)!;
  }

  delete(id: string) {
    this.db.prepare("DELETE FROM items WHERE id = ?").run(id);
  }

  private map(row: ItemRow): ItemRecord {
    return {
      id: row.id,
      tierListId: row.tier_list_id,
      sourceType: row.source_type,
      label: row.label,
      subtitle: row.subtitle,
      note: row.note,
      tags: this.parseArray(row.tags_json, "items.tags_json"),
      assetId: row.asset_id,
      style: this.parseObject(row.style_json, "items.style_json"),
      metadata: this.parseObject(row.metadata_json, "items.metadata_json"),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
