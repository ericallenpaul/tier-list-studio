import { BaseRepository } from "./baseRepository.js";
import type { ExportHistoryRecord, ExportKind, JsonObject } from "./types.js";

interface ExportHistoryRow {
  id: string;
  tier_list_id: string;
  export_kind: ExportKind;
  output_path: string;
  options_json: string;
  created_at: string;
}

export interface CreateExportHistoryInput {
  id?: string;
  tierListId: string;
  exportKind: ExportKind;
  outputPath: string;
  options?: JsonObject;
}

export class ExportHistoryRepository extends BaseRepository {
  create(input: CreateExportHistoryInput): ExportHistoryRecord {
    const id = input.id ?? this.id();
    this.db.prepare(`
      INSERT INTO export_history (id, tier_list_id, export_kind, output_path, options_json, created_at)
      VALUES (@id, @tierListId, @exportKind, @outputPath, @optionsJson, @createdAt)
    `).run({
      id,
      tierListId: input.tierListId,
      exportKind: input.exportKind,
      outputPath: input.outputPath,
      optionsJson: this.stringify(input.options, {}),
      createdAt: this.now()
    });
    return this.get(id)!;
  }

  get(id: string): ExportHistoryRecord | undefined {
    const row = this.db.prepare("SELECT * FROM export_history WHERE id = ?").get(id) as ExportHistoryRow | undefined;
    return row ? this.map(row) : undefined;
  }

  listByTierList(tierListId: string): ExportHistoryRecord[] {
    return (this.db.prepare("SELECT * FROM export_history WHERE tier_list_id = ? ORDER BY created_at DESC").all(tierListId) as ExportHistoryRow[])
      .map((row) => this.map(row));
  }

  delete(id: string) {
    this.db.prepare("DELETE FROM export_history WHERE id = ?").run(id);
  }

  private map(row: ExportHistoryRow): ExportHistoryRecord {
    return {
      id: row.id,
      tierListId: row.tier_list_id,
      exportKind: row.export_kind,
      outputPath: row.output_path,
      options: this.parseObject(row.options_json, "export_history.options_json"),
      createdAt: row.created_at
    };
  }
}
