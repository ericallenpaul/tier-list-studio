import { BaseRepository } from "./baseRepository.js";
import type { JsonValue, SnapshotRecord } from "./types.js";

interface SnapshotRow {
  id: string;
  tier_list_id: string;
  label: string;
  summary: string;
  state_json: string;
  created_at: string;
}

export interface CreateSnapshotInput {
  id?: string;
  tierListId: string;
  label: string;
  summary?: string;
  state: JsonValue;
}

export class SnapshotRepository extends BaseRepository {
  create(input: CreateSnapshotInput): SnapshotRecord {
    const id = input.id ?? this.id();
    this.db.prepare(`
      INSERT INTO snapshots (id, tier_list_id, label, summary, state_json, created_at)
      VALUES (@id, @tierListId, @label, @summary, @stateJson, @createdAt)
    `).run({
      id,
      tierListId: input.tierListId,
      label: input.label,
      summary: input.summary ?? "",
      stateJson: this.stringify(input.state, {}),
      createdAt: this.now()
    });
    return this.get(id)!;
  }

  get(id: string): SnapshotRecord | undefined {
    const row = this.db.prepare("SELECT * FROM snapshots WHERE id = ?").get(id) as SnapshotRow | undefined;
    return row ? this.map(row) : undefined;
  }

  listByTierList(tierListId: string): SnapshotRecord[] {
    return (this.db.prepare("SELECT * FROM snapshots WHERE tier_list_id = ? ORDER BY created_at DESC").all(tierListId) as SnapshotRow[])
      .map((row) => this.map(row));
  }

  delete(id: string) {
    this.db.prepare("DELETE FROM snapshots WHERE id = ?").run(id);
  }

  private map(row: SnapshotRow): SnapshotRecord {
    return {
      id: row.id,
      tierListId: row.tier_list_id,
      label: row.label,
      summary: row.summary,
      state: this.parseJson(row.state_json, {}, "snapshots.state_json"),
      createdAt: row.created_at
    };
  }
}
