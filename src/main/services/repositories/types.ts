export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface AppSettingRecord {
  key: string;
  value: JsonValue;
  updatedAt: string;
}

export interface WorkspaceRecord {
  id: string;
  name: string;
  description: string;
  theme: JsonObject;
  createdAt: string;
  updatedAt: string;
}

export interface TierListRecord {
  id: string;
  workspaceId: string;
  title: string;
  subtitle: string;
  description: string;
  slug: string;
  categories: JsonValue[];
  boardStyle: JsonObject;
  tierStyle: JsonObject;
  itemStyle: JsonObject;
  interaction: JsonObject;
  presentation: JsonObject;
  createdAt: string;
  updatedAt: string;
}

export interface TierRowRecord {
  id: string;
  tierListId: string;
  sortOrder: number;
  label: string;
  shortLabel: string;
  description: string;
  fillColor: string;
  textColor: string;
  accentColor: string;
  iconText: string;
  rowHeight: number;
  maxItems: number | null;
  style: JsonObject;
  createdAt: string;
  updatedAt: string;
}

export type SourceType = "text" | "image" | "video" | "mixed";
export type ContainerType = "pool" | "tier";
export type ExportKind = "png" | "jpeg" | "json" | "csv" | "print";

export interface MediaAssetRecord {
  id: string;
  sha256: string;
  originalName: string;
  mimeType: string;
  extension: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  sourcePath: string;
  managedRelPath: string;
  thumbRelPath: string;
  posterRelPath: string;
  metadata: JsonObject;
  createdAt: string;
}

export interface ItemRecord {
  id: string;
  tierListId: string;
  sourceType: SourceType;
  label: string;
  subtitle: string;
  note: string;
  tags: JsonValue[];
  assetId: string | null;
  style: JsonObject;
  metadata: JsonObject;
  createdAt: string;
  updatedAt: string;
}

export interface ItemPositionRecord {
  itemId: string;
  tierListId: string;
  containerType: ContainerType;
  tierRowId: string | null;
  sortOrder: number;
  updatedAt: string;
}

export interface TemplateRecord {
  id: string;
  sourceTierListId: string | null;
  name: string;
  description: string;
  category: string;
  definition: JsonValue;
  builtIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SnapshotRecord {
  id: string;
  tierListId: string;
  label: string;
  summary: string;
  state: JsonValue;
  createdAt: string;
}

export interface ExportHistoryRecord {
  id: string;
  tierListId: string;
  exportKind: ExportKind;
  outputPath: string;
  options: JsonObject;
  createdAt: string;
}

export interface SearchResult {
  entityType: string;
  entityId: string;
  title: string;
  body: string;
  tags: string;
  rank: number;
}
