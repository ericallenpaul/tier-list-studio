import { BaseRepository } from "./baseRepository.js";
import type { JsonObject, WorkspaceRecord } from "./types.js";

interface WorkspaceRow {
  id: string;
  name: string;
  description: string;
  theme_json: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkspaceInput {
  id?: string;
  name: string;
  description?: string;
  theme?: JsonObject;
}

export class WorkspaceRepository extends BaseRepository {
  create(input: CreateWorkspaceInput): WorkspaceRecord {
    const now = this.now();
    const id = input.id ?? this.id();
    this.db.prepare(`
      INSERT INTO workspaces (id, name, description, theme_json, created_at, updated_at)
      VALUES (@id, @name, @description, @themeJson, @createdAt, @updatedAt)
    `).run({
      id,
      name: input.name,
      description: input.description ?? "",
      themeJson: this.stringify(input.theme, {}),
      createdAt: now,
      updatedAt: now
    });
    return this.get(id)!;
  }

  get(id: string): WorkspaceRecord | undefined {
    const row = this.db.prepare("SELECT * FROM workspaces WHERE id = ?").get(id) as WorkspaceRow | undefined;
    return row ? this.map(row) : undefined;
  }

  list(): WorkspaceRecord[] {
    return (this.db.prepare("SELECT * FROM workspaces ORDER BY updated_at DESC, name").all() as WorkspaceRow[]).map((row) => this.map(row));
  }

  update(id: string, patch: Partial<Omit<CreateWorkspaceInput, "id">>): WorkspaceRecord {
    const current = this.get(id);
    if (!current) {
      throw new Error(`Workspace not found: ${id}`);
    }

    this.db.prepare(`
      UPDATE workspaces
      SET name = @name,
          description = @description,
          theme_json = @themeJson,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      name: patch.name ?? current.name,
      description: patch.description ?? current.description,
      themeJson: this.stringify(patch.theme ?? current.theme, {}),
      updatedAt: this.now()
    });
    return this.get(id)!;
  }

  delete(id: string) {
    this.db.prepare("DELETE FROM workspaces WHERE id = ?").run(id);
  }

  private map(row: WorkspaceRow): WorkspaceRecord {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      theme: this.parseObject(row.theme_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
