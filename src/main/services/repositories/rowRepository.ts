import { BaseRepository } from "./baseRepository.js";
import type { JsonObject, TierRowRecord } from "./types.js";

interface TierRowRow {
  id: string;
  tier_list_id: string;
  sort_order: number;
  label: string;
  short_label: string;
  description: string;
  fill_color: string;
  text_color: string;
  accent_color: string;
  icon_text: string;
  row_height: number;
  max_items: number | null;
  style_json: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTierRowInput {
  id?: string;
  tierListId: string;
  sortOrder: number;
  label: string;
  shortLabel?: string;
  description?: string;
  fillColor: string;
  textColor?: string;
  accentColor?: string;
  iconText?: string;
  rowHeight?: number;
  maxItems?: number | null;
  style?: JsonObject;
}

export class RowRepository extends BaseRepository {
  create(input: CreateTierRowInput): TierRowRecord {
    const now = this.now();
    const id = input.id ?? this.id();
    this.db.prepare(`
      INSERT INTO tier_rows (
        id, tier_list_id, sort_order, label, short_label, description, fill_color,
        text_color, accent_color, icon_text, row_height, max_items, style_json,
        created_at, updated_at
      )
      VALUES (
        @id, @tierListId, @sortOrder, @label, @shortLabel, @description, @fillColor,
        @textColor, @accentColor, @iconText, @rowHeight, @maxItems, @styleJson,
        @createdAt, @updatedAt
      )
    `).run({
      id,
      tierListId: input.tierListId,
      sortOrder: input.sortOrder,
      label: input.label,
      shortLabel: input.shortLabel ?? "",
      description: input.description ?? "",
      fillColor: input.fillColor,
      textColor: input.textColor ?? "#111827",
      accentColor: input.accentColor ?? "",
      iconText: input.iconText ?? "",
      rowHeight: input.rowHeight ?? 96,
      maxItems: input.maxItems ?? null,
      styleJson: this.stringify(input.style, {}),
      createdAt: now,
      updatedAt: now
    });
    return this.get(id)!;
  }

  get(id: string): TierRowRecord | undefined {
    const row = this.db.prepare("SELECT * FROM tier_rows WHERE id = ?").get(id) as TierRowRow | undefined;
    return row ? this.map(row) : undefined;
  }

  listByTierList(tierListId: string): TierRowRecord[] {
    return (this.db.prepare("SELECT * FROM tier_rows WHERE tier_list_id = ? ORDER BY sort_order").all(tierListId) as TierRowRow[])
      .map((row) => this.map(row));
  }

  update(id: string, patch: Partial<Omit<CreateTierRowInput, "id" | "tierListId">>): TierRowRecord {
    const current = this.get(id);
    if (!current) {
      throw new Error(`Tier row not found: ${id}`);
    }

    this.db.prepare(`
      UPDATE tier_rows
      SET sort_order = @sortOrder,
          label = @label,
          short_label = @shortLabel,
          description = @description,
          fill_color = @fillColor,
          text_color = @textColor,
          accent_color = @accentColor,
          icon_text = @iconText,
          row_height = @rowHeight,
          max_items = @maxItems,
          style_json = @styleJson,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      sortOrder: patch.sortOrder ?? current.sortOrder,
      label: patch.label ?? current.label,
      shortLabel: patch.shortLabel ?? current.shortLabel,
      description: patch.description ?? current.description,
      fillColor: patch.fillColor ?? current.fillColor,
      textColor: patch.textColor ?? current.textColor,
      accentColor: patch.accentColor ?? current.accentColor,
      iconText: patch.iconText ?? current.iconText,
      rowHeight: patch.rowHeight ?? current.rowHeight,
      maxItems: patch.maxItems ?? current.maxItems,
      styleJson: this.stringify(patch.style ?? current.style, {}),
      updatedAt: this.now()
    });
    return this.get(id)!;
  }

  delete(id: string) {
    this.db.prepare("DELETE FROM tier_rows WHERE id = ?").run(id);
  }

  private map(row: TierRowRow): TierRowRecord {
    return {
      id: row.id,
      tierListId: row.tier_list_id,
      sortOrder: row.sort_order,
      label: row.label,
      shortLabel: row.short_label,
      description: row.description,
      fillColor: row.fill_color,
      textColor: row.text_color,
      accentColor: row.accent_color,
      iconText: row.icon_text,
      rowHeight: row.row_height,
      maxItems: row.max_items,
      style: this.parseObject(row.style_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
