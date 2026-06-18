export type EntityId = string;
export type IsoTimestamp = string;
export type JsonRecord = Record<string, unknown>;

export interface Workspace {
  id: EntityId;
  name: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  lastOpenedAt?: IsoTimestamp;
}

export interface TierList {
  id: EntityId;
  workspaceId: EntityId;
  name: string;
  description?: string;
  isArchived: boolean;
  style: JsonRecord;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface TierRow {
  id: EntityId;
  listId: EntityId;
  label: string;
  color: string;
  sortOrder: number;
  style: JsonRecord;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export type TierItemKind = "text" | "image" | "video" | "audio" | "file";

export interface TierItem {
  id: EntityId;
  listId: EntityId;
  kind: TierItemKind;
  label: string;
  assetId?: EntityId;
  metadata: JsonRecord;
  style: JsonRecord;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface TierPosition {
  id: EntityId;
  listId: EntityId;
  rowId: EntityId | null;
  itemId: EntityId;
  sortOrder: number;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export type AssetKind = "image" | "video" | "audio" | "document" | "other";

export interface Asset {
  id: EntityId;
  workspaceId: EntityId;
  kind: AssetKind;
  originalPath: string;
  storedPath: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationMs?: number;
  createdAt: IsoTimestamp;
}

export interface TierTemplate {
  id: EntityId;
  name: string;
  sourceListId?: EntityId;
  rows: Array<Pick<TierRow, "label" | "color" | "style">>;
  style: JsonRecord;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface Snapshot {
  id: EntityId;
  listId: EntityId;
  label: string;
  data: JsonRecord;
  createdAt: IsoTimestamp;
}

export interface UserSettings {
  theme: "system" | "light" | "dark";
  defaultWorkspaceId?: EntityId;
  recentWorkspaceIds: EntityId[];
  exportDefaults: JsonRecord;
  ai: {
    preferredProviderId?: EntityId;
    enabled: boolean;
    openAiApiKeyConfigured: boolean;
    openAiApiKey?: string;
  };
}

export type ExportFormat = "png" | "jpg" | "webp" | "pdf" | "csv" | "package";

export interface ExportArtifact {
  filePath: string;
  format: ExportFormat;
  createdAt: IsoTimestamp;
}

export interface BackupArtifact {
  filePath: string;
  createdAt: IsoTimestamp;
  workspaceCount: number;
}

export interface AiProvider {
  id: EntityId;
  name: string;
  configured: boolean;
  enabled: boolean;
  capabilities: Array<"generate-items">;
}
