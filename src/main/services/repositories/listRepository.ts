import { BaseRepository } from "./baseRepository.js";
import type { JsonObject, JsonValue, TierListRecord } from "./types.js";

interface TierListRow {
  id: string;
  workspace_id: string;
  title: string;
  subtitle: string;
  description: string;
  slug: string;
  categories_json: string;
  board_style_json: string;
  tier_style_json: string;
  item_style_json: string;
  interaction_json: string;
  presentation_json: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTierListInput {
  id?: string;
  workspaceId: string;
  title: string;
  subtitle?: string;
  description?: string;
  slug?: string;
  categories?: JsonValue[];
  boardStyle?: JsonObject;
  tierStyle?: JsonObject;
  itemStyle?: JsonObject;
  interaction?: JsonObject;
  presentation?: JsonObject;
}

export class ListRepository extends BaseRepository {
  create(input: CreateTierListInput): TierListRecord {
    const now = this.now();
    const id = input.id ?? this.id();
    this.db.prepare(`
      INSERT INTO tier_lists (
        id, workspace_id, title, subtitle, description, slug, categories_json,
        board_style_json, tier_style_json, item_style_json, interaction_json,
        presentation_json, created_at, updated_at
      )
      VALUES (
        @id, @workspaceId, @title, @subtitle, @description, @slug, @categoriesJson,
        @boardStyleJson, @tierStyleJson, @itemStyleJson, @interactionJson,
        @presentationJson, @createdAt, @updatedAt
      )
    `).run({
      id,
      workspaceId: input.workspaceId,
      title: input.title,
      subtitle: input.subtitle ?? "",
      description: input.description ?? "",
      slug: input.slug ?? slugify(input.title),
      categoriesJson: this.stringify(input.categories, []),
      boardStyleJson: this.stringify(input.boardStyle, {}),
      tierStyleJson: this.stringify(input.tierStyle, {}),
      itemStyleJson: this.stringify(input.itemStyle, {}),
      interactionJson: this.stringify(input.interaction, {}),
      presentationJson: this.stringify(input.presentation, {}),
      createdAt: now,
      updatedAt: now
    });
    return this.get(id)!;
  }

  get(id: string): TierListRecord | undefined {
    const row = this.db.prepare("SELECT * FROM tier_lists WHERE id = ?").get(id) as TierListRow | undefined;
    return row ? this.map(row) : undefined;
  }

  listByWorkspace(workspaceId: string): TierListRecord[] {
    return (this.db.prepare("SELECT * FROM tier_lists WHERE workspace_id = ? ORDER BY updated_at DESC").all(workspaceId) as TierListRow[])
      .map((row) => this.map(row));
  }

  update(id: string, patch: Partial<Omit<CreateTierListInput, "id" | "workspaceId">>): TierListRecord {
    const current = this.get(id);
    if (!current) {
      throw new Error(`Tier list not found: ${id}`);
    }

    this.db.prepare(`
      UPDATE tier_lists
      SET title = @title,
          subtitle = @subtitle,
          description = @description,
          slug = @slug,
          categories_json = @categoriesJson,
          board_style_json = @boardStyleJson,
          tier_style_json = @tierStyleJson,
          item_style_json = @itemStyleJson,
          interaction_json = @interactionJson,
          presentation_json = @presentationJson,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      title: patch.title ?? current.title,
      subtitle: patch.subtitle ?? current.subtitle,
      description: patch.description ?? current.description,
      slug: patch.slug ?? current.slug,
      categoriesJson: this.stringify(patch.categories ?? current.categories, []),
      boardStyleJson: this.stringify(patch.boardStyle ?? current.boardStyle, {}),
      tierStyleJson: this.stringify(patch.tierStyle ?? current.tierStyle, {}),
      itemStyleJson: this.stringify(patch.itemStyle ?? current.itemStyle, {}),
      interactionJson: this.stringify(patch.interaction ?? current.interaction, {}),
      presentationJson: this.stringify(patch.presentation ?? current.presentation, {}),
      updatedAt: this.now()
    });
    return this.get(id)!;
  }

  delete(id: string) {
    this.db.prepare("DELETE FROM tier_lists WHERE id = ?").run(id);
  }

  private map(row: TierListRow): TierListRecord {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      title: row.title,
      subtitle: row.subtitle,
      description: row.description,
      slug: row.slug,
      categories: this.parseArray(row.categories_json),
      boardStyle: this.parseObject(row.board_style_json),
      tierStyle: this.parseObject(row.tier_style_json),
      itemStyle: this.parseObject(row.item_style_json),
      interaction: this.parseObject(row.interaction_json),
      presentation: this.parseObject(row.presentation_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

const slugify = (value: string) => {
  const slug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || "untitled";
};
