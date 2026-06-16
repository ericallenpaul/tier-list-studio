import { BaseRepository } from "./baseRepository.js";
import type { AppSettingRecord, JsonValue } from "./types.js";

interface SettingRow {
  key: string;
  value_json: string;
  updated_at: string;
}

export class SettingsRepository extends BaseRepository {
  get(key: string): AppSettingRecord | undefined {
    const row = this.db.prepare("SELECT * FROM app_settings WHERE key = ?").get(key) as SettingRow | undefined;
    return row ? this.map(row) : undefined;
  }

  list(): AppSettingRecord[] {
    return (this.db.prepare("SELECT * FROM app_settings ORDER BY key").all() as SettingRow[]).map((row) => this.map(row));
  }

  set(key: string, value: JsonValue): AppSettingRecord {
    const updatedAt = this.now();
    this.db.prepare(`
      INSERT INTO app_settings (key, value_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
    `).run(key, JSON.stringify(value), updatedAt);
    return this.get(key)!;
  }

  delete(key: string) {
    this.db.prepare("DELETE FROM app_settings WHERE key = ?").run(key);
  }

  private map(row: SettingRow): AppSettingRecord {
    return {
      key: row.key,
      value: this.parseJson(row.value_json, null),
      updatedAt: row.updated_at
    };
  }
}
