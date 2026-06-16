import { BaseRepository } from "./baseRepository.js";
import type { SearchResult } from "./types.js";

interface SearchRow {
  entity_type: string;
  entity_id: string;
  title: string;
  body: string;
  tags: string;
  rank: number;
}

export interface ReplaceSearchDocumentInput {
  entityType: string;
  entityId: string;
  title: string;
  body?: string;
  tags?: string[] | string;
}

export class SearchRepository extends BaseRepository {
  replace(input: ReplaceSearchDocumentInput) {
    const replace = this.db.transaction(() => {
      this.delete(input.entityType, input.entityId);
      this.db.prepare(`
        INSERT INTO search_index (entity_type, entity_id, title, body, tags)
        VALUES (?, ?, ?, ?, ?)
      `).run(input.entityType, input.entityId, input.title, input.body ?? "", normalizeTags(input.tags));
    });
    replace();
  }

  delete(entityType: string, entityId: string) {
    this.db.prepare("DELETE FROM search_index WHERE entity_type = ? AND entity_id = ?").run(entityType, entityId);
  }

  query(text: string, options: { entityType?: string; limit?: number } = {}): SearchResult[] {
    const limit = options.limit ?? 20;
    const rows = options.entityType
      ? this.db.prepare(`
          SELECT entity_type, entity_id, title, body, tags, bm25(search_index) AS rank
          FROM search_index
          WHERE search_index MATCH ? AND entity_type = ?
          ORDER BY rank
          LIMIT ?
        `).all(text, options.entityType, limit) as SearchRow[]
      : this.db.prepare(`
          SELECT entity_type, entity_id, title, body, tags, bm25(search_index) AS rank
          FROM search_index
          WHERE search_index MATCH ?
          ORDER BY rank
          LIMIT ?
        `).all(text, limit) as SearchRow[];

    return rows.map((row) => ({
      entityType: row.entity_type,
      entityId: row.entity_id,
      title: row.title,
      body: row.body,
      tags: row.tags,
      rank: row.rank
    }));
  }
}

const normalizeTags = (tags: string[] | string | undefined) => Array.isArray(tags) ? tags.join(" ") : tags ?? "";
