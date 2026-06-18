import { BaseRepository } from "./baseRepository.js";
import type { SettingsUpdateInput } from "../../../shared/models/api.js";
import type { UserSettings } from "../../../shared/models/entities.js";
import type { AppSettingRecord, JsonValue } from "./types.js";

interface SettingRow {
  key: string;
  value_json: string;
  updated_at: string;
}

export class SettingsRepository extends BaseRepository {
  getUserSettings(): UserSettings {
    const ai = asRecord(this.get("ai")?.value) ?? {};
    return {
      theme: asTheme(this.get("theme")?.value),
      defaultWorkspaceId: asOptionalString(this.get("defaultWorkspaceId")?.value),
      recentWorkspaceIds: asStringArray(this.get("recentWorkspaceIds")?.value),
      exportDefaults: asRecord(this.get("exportDefaults")?.value) ?? {},
      ai: {
        preferredProviderId: asOptionalString(ai.preferredProviderId),
        enabled: typeof ai.enabled === "boolean" ? ai.enabled : false,
        openAiApiKey: asOptionalString(ai.openAiApiKey)
      }
    };
  }

  updateUserSettings(patch: SettingsUpdateInput): UserSettings {
    const current = this.getUserSettings();

    if (patch.theme !== undefined) {
      this.set("theme", patch.theme);
    }
    if (patch.defaultWorkspaceId !== undefined) {
      this.set("defaultWorkspaceId", patch.defaultWorkspaceId);
    }
    if (patch.recentWorkspaceIds !== undefined) {
      this.set("recentWorkspaceIds", patch.recentWorkspaceIds);
    }
    if (patch.exportDefaults !== undefined) {
      this.set("exportDefaults", patch.exportDefaults as JsonValue);
    }
    if (patch.ai !== undefined) {
      this.set("ai", {
        ...current.ai,
        ...patch.ai
      });
    }

    return this.getUserSettings();
  }

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
      value: this.parseJson(row.value_json, null, "app_settings.value_json"),
      updatedAt: row.updated_at
    };
  }
}

const asTheme = (value: JsonValue | undefined): UserSettings["theme"] =>
  value === "light" || value === "dark" || value === "system" ? value : "system";

const asOptionalString = (value: unknown) => typeof value === "string" && value.trim() ? value : undefined;

const asStringArray = (value: JsonValue | undefined) =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

const asRecord = (value: unknown): Record<string, JsonValue> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, JsonValue> : undefined;
