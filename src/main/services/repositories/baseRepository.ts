import { randomUUID } from "node:crypto";

import type { SqliteDatabase } from "../db/connection.js";
import type { JsonObject, JsonValue } from "./types.js";

export abstract class BaseRepository {
  protected constructor(protected readonly db: SqliteDatabase) {}

  protected now() {
    return new Date().toISOString();
  }

  protected id() {
    return randomUUID();
  }

  protected stringify(value: JsonValue | undefined, fallback: JsonValue) {
    return JSON.stringify(value ?? fallback);
  }

  protected parseJson(value: string, fallback: JsonValue): JsonValue {
    try {
      return JSON.parse(value) as JsonValue;
    } catch {
      return fallback;
    }
  }

  protected parseObject(value: string): JsonObject {
    const parsed = this.parseJson(value, {});
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonObject : {};
  }

  protected parseArray(value: string): JsonValue[] {
    const parsed = this.parseJson(value, []);
    return Array.isArray(parsed) ? parsed : [];
  }
}
