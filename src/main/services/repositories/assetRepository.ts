import { BaseRepository } from "./baseRepository.js";
import type { JsonObject, MediaAssetRecord } from "./types.js";

interface MediaAssetRow {
  id: string;
  sha256: string;
  original_name: string;
  mime_type: string;
  extension: string;
  byte_size: number;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  source_path: string;
  managed_rel_path: string;
  thumb_rel_path: string;
  poster_rel_path: string;
  metadata_json: string;
  created_at: string;
}

export interface CreateMediaAssetInput {
  id?: string;
  sha256: string;
  originalName: string;
  mimeType: string;
  extension: string;
  byteSize: number;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  sourcePath: string;
  managedRelPath: string;
  thumbRelPath?: string;
  posterRelPath?: string;
  metadata?: JsonObject;
}

export class AssetRepository extends BaseRepository {
  getOrCreate(input: CreateMediaAssetInput): MediaAssetRecord {
    return this.findBySha256(input.sha256) ?? this.create(input);
  }

  create(input: CreateMediaAssetInput): MediaAssetRecord {
    const id = input.id ?? this.id();
    this.db.prepare(`
      INSERT INTO media_assets (
        id, sha256, original_name, mime_type, extension, byte_size, width, height,
        duration_ms, source_path, managed_rel_path, thumb_rel_path, poster_rel_path,
        metadata_json, created_at
      )
      VALUES (
        @id, @sha256, @originalName, @mimeType, @extension, @byteSize, @width, @height,
        @durationMs, @sourcePath, @managedRelPath, @thumbRelPath, @posterRelPath,
        @metadataJson, @createdAt
      )
    `).run({
      id,
      sha256: input.sha256,
      originalName: input.originalName,
      mimeType: input.mimeType,
      extension: input.extension,
      byteSize: input.byteSize,
      width: input.width ?? null,
      height: input.height ?? null,
      durationMs: input.durationMs ?? null,
      sourcePath: input.sourcePath,
      managedRelPath: input.managedRelPath,
      thumbRelPath: input.thumbRelPath ?? "",
      posterRelPath: input.posterRelPath ?? "",
      metadataJson: this.stringify(input.metadata, {}),
      createdAt: this.now()
    });
    return this.get(id)!;
  }

  get(id: string): MediaAssetRecord | undefined {
    const row = this.db.prepare("SELECT * FROM media_assets WHERE id = ?").get(id) as MediaAssetRow | undefined;
    return row ? this.map(row) : undefined;
  }

  findBySha256(sha256: string): MediaAssetRecord | undefined {
    const row = this.db.prepare("SELECT * FROM media_assets WHERE sha256 = ?").get(sha256) as MediaAssetRow | undefined;
    return row ? this.map(row) : undefined;
  }

  list(): MediaAssetRecord[] {
    return (this.db.prepare("SELECT * FROM media_assets ORDER BY created_at DESC").all() as MediaAssetRow[]).map((row) => this.map(row));
  }

  delete(id: string) {
    this.db.prepare("DELETE FROM media_assets WHERE id = ?").run(id);
  }

  private map(row: MediaAssetRow): MediaAssetRecord {
    return {
      id: row.id,
      sha256: row.sha256,
      originalName: row.original_name,
      mimeType: row.mime_type,
      extension: row.extension,
      byteSize: row.byte_size,
      width: row.width,
      height: row.height,
      durationMs: row.duration_ms,
      sourcePath: row.source_path,
      managedRelPath: row.managed_rel_path,
      thumbRelPath: row.thumb_rel_path,
      posterRelPath: row.poster_rel_path,
      metadata: this.parseObject(row.metadata_json, "media_assets.metadata_json"),
      createdAt: row.created_at
    };
  }
}
