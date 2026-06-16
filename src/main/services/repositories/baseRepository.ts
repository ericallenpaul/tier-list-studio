import { randomUUID } from "node:crypto";

import type { SqliteDatabase } from "../db/connection.js";
import type { JsonObject, JsonValue } from "./types.js";

export abstract class BaseRepository {
  constructor(protected readonly db: SqliteDatabase) {}

  protected now() {
    return new Date().toISOString();
  }

  protected id() {
    return randomUUID();
  }

  protected stringify(value: JsonValue | undefined, fallback: JsonValue) {
    return JSON.stringify(value ?? fallback);
  }

  protected parseJson(value: string | null | undefined, fallback: JsonValue, columnName = "JSON column"): JsonValue {
    if (value === null || value === undefined) {
      return fallback;
    }

    try {
      return JSON.parse(value) as JsonValue;
    } catch (error) {
      throw new Error(`Invalid persisted JSON in ${columnName}: ${(error as Error).message}`);
    }
  }

  protected parseObject(value: string | null | undefined, columnName = "JSON object column"): JsonObject {
    const parsed = this.parseJson(value, {}, columnName);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`Invalid persisted JSON in ${columnName}: expected object`);
    }

    return parsed as JsonObject;
  }

  protected parseArray(value: string | null | undefined, columnName = "JSON array column"): JsonValue[] {
    const parsed = this.parseJson(value, [], columnName);
    if (!Array.isArray(parsed)) {
      throw new Error(`Invalid persisted JSON in ${columnName}: expected array`);
    }

    return parsed;
  }
}
