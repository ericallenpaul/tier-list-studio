import { BaseRepository } from "./baseRepository.js";
import type { JsonValue, TemplateRecord } from "./types.js";

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
}
