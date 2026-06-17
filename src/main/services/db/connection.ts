import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type SqliteDatabase = Database.Database;

export interface OpenDatabaseOptions {
  readonly filePath: string;
  readonly readonly?: boolean;
}

export const openDatabase = ({ filePath, readonly = false }: OpenDatabaseOptions): SqliteDatabase => {
  if (filePath !== ":memory:") {
    mkdirSync(dirname(filePath), { recursive: true });
  }

  const db = new Database(filePath, { readonly });
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  if (!readonly) {
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
  }

  return db;
};

export const closeDatabase = (db: SqliteDatabase) => {
  db.close();
};
