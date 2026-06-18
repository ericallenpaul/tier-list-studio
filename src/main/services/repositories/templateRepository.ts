import { BaseRepository } from "./baseRepository.js";
import type { SqliteDatabase } from "../db/connection.js";
import type { JsonObject, JsonValue, TemplateRecord, TierListRecord } from "./types.js";
import { SearchRepository } from "./searchRepository.js";

interface TemplateRow {
  id: string;
  source_tier_list_id: string | null;
  name: string;
  description: string;
  category: string;
  definition_json: string;
  built_in: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  id?: string;
  sourceTierListId?: string | null;
  name: string;
  description?: string;
  category?: string;
  definition: JsonValue;
  builtIn?: boolean;
}

type TemplateDefinitionRow = {
  label: string;
  fillColor: string;
  textColor?: string;
  style?: JsonObject;
};

type TemplateDefinitionItem = {
  label: string;
  sourceType: "text" | "image" | "video" | "mixed";
  assetId?: string | null;
  metadata?: JsonObject;
  style?: JsonObject;
  container: "pool" | "tier";
  rowIndex: number | null;
  sortOrder: number;
};

type TemplateDefinition = {
  rows: TemplateDefinitionRow[];
  items?: TemplateDefinitionItem[];
  style?: JsonObject;
};

export class TemplateRepository extends BaseRepository {
  create(input: CreateTemplateInput): TemplateRecord {
    const now = this.now();
    const id = input.id ?? this.id();
    this.db.prepare(`
      INSERT INTO templates (
        id, source_tier_list_id, name, description, category, definition_json,
        built_in, created_at, updated_at
      )
      VALUES (
        @id, @sourceTierListId, @name, @description, @category, @definitionJson,
        @builtIn, @createdAt, @updatedAt
      )
    `).run({
      id,
      sourceTierListId: input.sourceTierListId ?? null,
      name: input.name,
      description: input.description ?? "",
      category: input.category ?? "",
      definitionJson: this.stringify(input.definition, {}),
      builtIn: input.builtIn ? 1 : 0,
      createdAt: now,
      updatedAt: now
    });
    return this.get(id)!;
  }

  get(id: string): TemplateRecord | undefined {
    const row = this.db.prepare("SELECT * FROM templates WHERE id = ?").get(id) as TemplateRow | undefined;
    return row ? this.map(row) : undefined;
  }

  list(): TemplateRecord[] {
    return (this.db.prepare("SELECT * FROM templates ORDER BY built_in DESC, name").all() as TemplateRow[]).map((row) => this.map(row));
  }

  createFromList(listId: string, name: string): TemplateRecord {
    const source = this.db.prepare("SELECT * FROM tier_lists WHERE id = ?").get(listId) as SourceListRow | undefined;
    if (!source) {
      throw new Error(`Tier list not found: ${listId}`);
    }

    const rows = this.sourceRows(listId);
    const rowIndexById = new Map(rows.map((row, index) => [row.id, index]));
    const positionsByItemId = new Map(this.sourcePositions(listId).map((position) => [position.item_id, position]));
    const items = this.sourceItems(listId).map<TemplateDefinitionItem>((item, index) => {
      const position = positionsByItemId.get(item.id);
      return {
        label: item.label,
        sourceType: item.source_type,
        assetId: item.asset_id,
        metadata: this.parseObject(item.metadata_json, "items.metadata_json"),
        style: this.parseObject(item.style_json, "items.style_json"),
        container: position?.container_type ?? "pool",
        rowIndex: position?.tier_row_id ? rowIndexById.get(position.tier_row_id) ?? null : null,
        sortOrder: position?.sort_order ?? index
      };
    });

    return this.create({
      sourceTierListId: listId,
      name,
      definition: {
        rows: rows.map((row) => ({
          label: row.label,
          fillColor: row.fill_color,
          textColor: row.text_color,
          style: this.parseObject(row.style_json, "tier_rows.style_json")
        })),
        items,
        style: this.parseObject(source.board_style_json, "tier_lists.board_style_json")
      }
    });
  }

  instantiate(templateId: string, workspaceId: string): TierListRecord {
    const template = this.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    if (!this.db.prepare("SELECT 1 FROM workspaces WHERE id = ?").get(workspaceId)) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    const definition = normalizeTemplateDefinition(template.definition);
    const now = this.now();
    const listId = this.id();
    const slug = uniqueSlug(this.db, workspaceId, template.name);
    const search = new SearchRepository(this.db);

    this.db.prepare(`
      INSERT INTO tier_lists (
        id, workspace_id, title, subtitle, description, slug, categories_json,
        board_style_json, tier_style_json, item_style_json, interaction_json,
        presentation_json, created_at, updated_at
      )
      VALUES (
        @id, @workspaceId, @title, '', '', @slug, '[]',
        @boardStyleJson, '{}', '{}', '{}', '{}', @createdAt, @updatedAt
      )
    `).run({
      id: listId,
      workspaceId,
      title: template.name,
      slug,
      boardStyleJson: this.stringify(definition.style, {}),
      createdAt: now,
      updatedAt: now
    });
    search.replace({
      entityType: "list",
      entityId: listId,
      title: template.name
    });

    const rowIds = definition.rows.map((row, index) => {
      const rowId = this.id();
      this.db.prepare(`
        INSERT INTO tier_rows (
          id, tier_list_id, sort_order, label, short_label, description, fill_color,
          text_color, accent_color, icon_text, row_height, max_items, style_json,
          created_at, updated_at
        )
        VALUES (
          @id, @tierListId, @sortOrder, @label, '', '', @fillColor,
          @textColor, '', '', 96, NULL, @styleJson, @createdAt, @updatedAt
        )
      `).run({
        id: rowId,
        tierListId: listId,
        sortOrder: index,
        label: row.label,
        fillColor: row.fillColor,
        textColor: row.textColor ?? "#111827",
        styleJson: this.stringify(row.style, {}),
        createdAt: now,
        updatedAt: now
      });
      return rowId;
    });

    for (const [index, item] of (definition.items ?? []).entries()) {
      const itemId = this.id();
      this.db.prepare(`
        INSERT INTO items (
          id, tier_list_id, source_type, label, subtitle, note, tags_json, asset_id,
          style_json, metadata_json, created_at, updated_at
        )
        VALUES (
          @id, @tierListId, @sourceType, @label, '', '', '[]', @assetId,
          @styleJson, @metadataJson, @createdAt, @updatedAt
        )
      `).run({
        id: itemId,
        tierListId: listId,
        sourceType: item.sourceType,
        label: item.label,
        assetId: this.resolveAssetId(item.assetId),
        styleJson: this.stringify(item.style, {}),
        metadataJson: this.stringify(item.metadata, {}),
        createdAt: now,
        updatedAt: now
      });
      search.replace({
        entityType: "item",
        entityId: itemId,
        title: item.label
      });

      const rowId = item.container === "tier" && item.rowIndex !== null ? rowIds[item.rowIndex] : undefined;
      this.db.prepare(`
        INSERT INTO item_positions (item_id, tier_list_id, container_type, tier_row_id, sort_order, updated_at)
        VALUES (@itemId, @tierListId, @containerType, @tierRowId, @sortOrder, @updatedAt)
      `).run({
        itemId,
        tierListId: listId,
        containerType: rowId ? "tier" : "pool",
        tierRowId: rowId ?? null,
        sortOrder: item.sortOrder ?? index,
        updatedAt: now
      });
    }

    return this.mapList(this.db.prepare("SELECT * FROM tier_lists WHERE id = ?").get(listId) as SourceListRow);
  }

  update(id: string, patch: Partial<Omit<CreateTemplateInput, "id">>): TemplateRecord {
    const current = this.get(id);
    if (!current) {
      throw new Error(`Template not found: ${id}`);
    }

    this.db.prepare(`
      UPDATE templates
      SET source_tier_list_id = @sourceTierListId,
          name = @name,
          description = @description,
          category = @category,
          definition_json = @definitionJson,
          built_in = @builtIn,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      sourceTierListId: patch.sourceTierListId === undefined ? current.sourceTierListId : patch.sourceTierListId,
      name: patch.name ?? current.name,
      description: patch.description ?? current.description,
      category: patch.category ?? current.category,
      definitionJson: this.stringify(patch.definition ?? current.definition, {}),
      builtIn: patch.builtIn === undefined ? (current.builtIn ? 1 : 0) : (patch.builtIn ? 1 : 0),
      updatedAt: this.now()
    });
    return this.get(id)!;
  }

  delete(id: string) {
    this.db.prepare("DELETE FROM templates WHERE id = ?").run(id);
  }

  private map(row: TemplateRow): TemplateRecord {
    return {
      id: row.id,
      sourceTierListId: row.source_tier_list_id,
      name: row.name,
      description: row.description,
      category: row.category,
      definition: this.parseJson(row.definition_json, {}, "templates.definition_json"),
      builtIn: row.built_in === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapList(row: SourceListRow): TierListRecord {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      title: row.title,
      subtitle: row.subtitle,
      description: row.description,
      slug: row.slug,
      categories: this.parseArray(row.categories_json, "tier_lists.categories_json"),
      boardStyle: this.parseObject(row.board_style_json, "tier_lists.board_style_json"),
      tierStyle: this.parseObject(row.tier_style_json, "tier_lists.tier_style_json"),
      itemStyle: this.parseObject(row.item_style_json, "tier_lists.item_style_json"),
      interaction: this.parseObject(row.interaction_json, "tier_lists.interaction_json"),
      presentation: this.parseObject(row.presentation_json, "tier_lists.presentation_json"),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private sourceRows(listId: string) {
    return this.db.prepare("SELECT * FROM tier_rows WHERE tier_list_id = ? ORDER BY sort_order").all(listId) as SourceRowRow[];
  }

  private sourceItems(listId: string) {
    return this.db.prepare("SELECT * FROM items WHERE tier_list_id = ? ORDER BY created_at, id").all(listId) as SourceItemRow[];
  }

  private sourcePositions(listId: string) {
    return this.db.prepare("SELECT * FROM item_positions WHERE tier_list_id = ? ORDER BY container_type, sort_order").all(listId) as SourcePositionRow[];
  }

  private resolveAssetId(assetId: string | null | undefined) {
    if (!assetId) {
      return null;
    }

    return this.db.prepare("SELECT 1 FROM media_assets WHERE id = ?").get(assetId) ? assetId : null;
  }
}

interface SourceListRow {
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

interface SourceRowRow {
  id: string;
  label: string;
  fill_color: string;
  text_color: string;
  style_json: string;
}

interface SourceItemRow {
  id: string;
  source_type: TemplateDefinitionItem["sourceType"];
  label: string;
  asset_id: string | null;
  style_json: string;
  metadata_json: string;
}

interface SourcePositionRow {
  item_id: string;
  container_type: "pool" | "tier";
  tier_row_id: string | null;
  sort_order: number;
}

const normalizeTemplateDefinition = (value: JsonValue): TemplateDefinition => {
  if (!isRecord(value)) {
    return { rows: [], style: {} };
  }

  const rowsValue = Array.isArray(value.rows) ? value.rows : [];
  const rows = rowsValue
    .filter(isRecord)
    .map<TemplateDefinitionRow>((row) => ({
      label: typeof row.label === "string" ? row.label : "",
      fillColor: typeof row.fillColor === "string"
        ? row.fillColor
        : typeof row.color === "string"
          ? row.color
          : "#64748b",
      textColor: typeof row.textColor === "string" ? row.textColor : "#111827",
      style: isRecord(row.style) ? row.style : {}
    }))
    .filter((row) => row.label.trim());

  const itemsValue = Array.isArray(value.items) ? value.items : [];
  const items = itemsValue
    .filter(isRecord)
    .map<TemplateDefinitionItem>((item, index) => ({
      label: typeof item.label === "string" ? item.label : "",
      sourceType: isSourceType(item.sourceType) ? item.sourceType : "text",
      assetId: typeof item.assetId === "string" && item.assetId.trim() ? item.assetId : null,
      metadata: isRecord(item.metadata) ? item.metadata : {},
      style: isRecord(item.style) ? item.style : {},
      container: item.container === "tier" ? "tier" : "pool",
      rowIndex: typeof item.rowIndex === "number" ? item.rowIndex : null,
      sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : index
    }))
    .filter((item) => item.label.trim());

  return {
    rows,
    items,
    style: isRecord(value.style) ? value.style : isRecord(value.styles) ? value.styles : {}
  };
};

const isRecord = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isSourceType = (value: unknown): value is TemplateDefinitionItem["sourceType"] =>
  value === "text" || value === "image" || value === "video" || value === "mixed";

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
