import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { SqliteDatabase } from "./connection.js";

const migrationId = 1;
const migrationName = "initial_schema";
const seedTimestamp = "2026-01-01T00:00:00.000Z";
const defaultWorkspaceId = "workspace-default";

const schemaCandidates = () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return [
    join(currentDir, "schema.sql"),
    join(process.cwd(), "src", "main", "services", "db", "schema.sql")
  ];
};

const readSchemaSql = () => {
  const schemaPath = schemaCandidates().find((candidate) => existsSync(candidate));
  if (!schemaPath) {
    throw new Error("Unable to locate SQLite schema.sql");
  }

  return readFileSync(schemaPath, "utf8");
};

export const ensureMigrationTable = (db: SqliteDatabase) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    ) STRICT;
  `);
};

export const runMigrations = (db: SqliteDatabase) => {
  ensureMigrationTable(db);

  const hasInitialMigration = db
    .prepare("SELECT 1 FROM schema_migrations WHERE id = ?")
    .get(migrationId);

  if (!hasInitialMigration) {
    const migrate = db.transaction(() => {
      db.exec(readSchemaSql());
      db.prepare("INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)").run(
        migrationId,
        migrationName,
        new Date().toISOString()
      );
    });
    migrate();
  }

  seedDatabase(db);
};

export const seedDatabase = (db: SqliteDatabase) => {
  const seed = db.transaction(() => {
    db.prepare(`
      INSERT OR IGNORE INTO workspaces (id, name, description, theme_json, created_at, updated_at)
      VALUES (@id, @name, @description, @themeJson, @createdAt, @updatedAt)
    `).run({
      id: defaultWorkspaceId,
      name: "Default Workspace",
      description: "Starter workspace for local tier lists.",
      themeJson: JSON.stringify({ mode: "system", accentColor: "#2563eb" }),
      createdAt: seedTimestamp,
      updatedAt: seedTimestamp
    });

    const settings = [
      ["defaultWorkspaceId", defaultWorkspaceId],
      ["theme", "system"],
      ["recentWorkspaceIds", [defaultWorkspaceId]],
      ["exportDefaults", { format: "png", scale: 2, transparentBackground: false }],
      ["builtInThemes", [
        { id: "classic", name: "Classic", accentColor: "#2563eb" },
        { id: "contrast", name: "High Contrast", accentColor: "#111827" },
        { id: "warm", name: "Warm", accentColor: "#b45309" }
      ]]
    ] as const;

    const insertSetting = db.prepare(`
      INSERT OR IGNORE INTO app_settings (key, value_json, updated_at)
      VALUES (?, ?, ?)
    `);
    for (const [key, value] of settings) {
      insertSetting.run(key, JSON.stringify(value), seedTimestamp);
    }

    const insertTemplate = db.prepare(`
      INSERT OR IGNORE INTO templates (
        id,
        source_tier_list_id,
        name,
        description,
        category,
        definition_json,
        built_in,
        created_at,
        updated_at
      )
      VALUES (@id, NULL, @name, @description, @category, @definitionJson, 1, @createdAt, @updatedAt)
    `);

    for (const template of starterTemplates) {
      insertTemplate.run({
        ...template,
        definitionJson: JSON.stringify(template.definition),
        createdAt: seedTimestamp,
        updatedAt: seedTimestamp
      });
    }
  });

  seed();
};

const starterTemplates = [
  {
    id: "template-launch-week",
    name: "Launch Week",
    description: "S through D launch board with sample creator gear.",
    category: "General",
    definition: {
      rows: [
        { label: "S", fillColor: "#ef4444", textColor: "#ffffff" },
        { label: "A", fillColor: "#f97316", textColor: "#111827" },
        { label: "B", fillColor: "#eab308", textColor: "#111827" },
        { label: "C", fillColor: "#22c55e", textColor: "#111827" },
        { label: "D", fillColor: "#3b82f6", textColor: "#ffffff" }
      ],
      items: [
        { label: "Ramen", sourceType: "text", container: "pool", rowIndex: null, sortOrder: 0 },
        { label: "Coffee", sourceType: "text", container: "pool", rowIndex: null, sortOrder: 1 },
        { label: "Camera", sourceType: "text", container: "pool", rowIndex: null, sortOrder: 2 },
        { label: "Headphones", sourceType: "text", container: "pool", rowIndex: null, sortOrder: 3 },
        { label: "Notebook", sourceType: "text", container: "pool", rowIndex: null, sortOrder: 4 },
        { label: "Desk Lamp", sourceType: "text", container: "pool", rowIndex: null, sortOrder: 5 },
        { label: "Microphone", sourceType: "text", container: "pool", rowIndex: null, sortOrder: 6 },
        { label: "Mouse", sourceType: "text", container: "pool", rowIndex: null, sortOrder: 7 }
      ],
      styles: {}
    }
  },
  {
    id: "template-classic-ranking",
    name: "Classic Ranking",
    description: "S through D rows for general rankings.",
    category: "General",
    definition: {
      rows: [
        { label: "S", fillColor: "#ef4444", textColor: "#ffffff" },
        { label: "A", fillColor: "#f97316", textColor: "#111827" },
        { label: "B", fillColor: "#eab308", textColor: "#111827" },
        { label: "C", fillColor: "#22c55e", textColor: "#111827" },
        { label: "D", fillColor: "#3b82f6", textColor: "#ffffff" }
      ],
      styles: {}
    }
  },
  {
    id: "template-simple-priority",
    name: "Simple Priority",
    description: "High, medium, low, and backlog rows.",
    category: "Planning",
    definition: {
      rows: [
        { label: "High", fillColor: "#dc2626", textColor: "#ffffff" },
        { label: "Medium", fillColor: "#f59e0b", textColor: "#111827" },
        { label: "Low", fillColor: "#16a34a", textColor: "#ffffff" },
        { label: "Backlog", fillColor: "#64748b", textColor: "#ffffff" }
      ],
      styles: {}
    }
  }
] as const;
