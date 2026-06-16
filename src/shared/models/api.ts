import type {
  AiProvider,
  BackupArtifact,
  ExportArtifact,
  TierItem,
  TierList,
  TierPosition,
  TierRow,
  TierTemplate,
  Snapshot,
  UserSettings,
  Workspace
} from "./entities.js";
import type {
  AiGenerateItemsInput,
  ItemSearchInput,
  ItemUpdateInput,
  ListCreateInput,
  ListUpdateInput,
  OpenFilesInput,
  PositionMoveInput,
  RenderImageInput,
  RowInsertInput,
  RowUpdateInput,
  SaveFileInput,
  SettingsUpdateInput,
  WorkspaceCreateInput,
  WorkspaceUpdateInput
} from "../schemas/inputs.js";

export interface AppPaths {
  userData: string;
  documents: string;
  temp: string;
}

export interface DialogFileFilter {
  name: string;
  extensions: string[];
}

export type OpenFilesOptions = OpenFilesInput;
export type SaveFileOptions = SaveFileInput;

export interface OpenFilesResult {
  canceled: boolean;
  filePaths: string[];
}

export interface SaveFileResult {
  canceled: boolean;
  filePath?: string;
}

export interface GeneratedItemsResult {
  items: Array<Pick<TierItem, "label" | "metadata">>;
}

export interface TierStudioDomainResults {
  app: {
    getVersion: string;
    getPaths: AppPaths;
  };
  dialogs: {
    openFiles: OpenFilesResult;
    saveFile: SaveFileResult;
  };
  workspaces: {
    list: Workspace[];
    create: Workspace;
    update: Workspace;
  };
  lists: {
    list: TierList[];
    get: TierList | undefined;
    create: TierList;
    update: TierList;
    duplicate: TierList;
    archive: TierList;
  };
  rows: {
    insert: TierRow;
    update: TierRow;
    reorder: TierRow[];
    remove: void;
  };
  items: {
    addTextBatch: TierItem[];
    importAssets: TierItem[];
    update: TierItem;
    remove: void;
    search: TierItem[];
  };
  positions: {
    move: TierPosition[];
    normalize: TierPosition[];
  };
  templates: {
    list: TierTemplate[];
    createFromList: TierTemplate;
    instantiate: TierList;
  };
  snapshots: {
    create: Snapshot;
    list: Snapshot[];
    restore: TierList;
  };
  exports: {
    renderImage: ExportArtifact;
    exportPackage: ExportArtifact;
    exportCsv: ExportArtifact;
  };
  backups: {
    create: BackupArtifact;
    restore: void;
  };
  settings: {
    get: UserSettings;
    update: UserSettings;
  };
  ai: {
    getProviders: AiProvider[];
    generateItems: GeneratedItemsResult;
  };
}

export type {
  AiGenerateItemsInput,
  ItemSearchInput,
  ItemUpdateInput,
  ListCreateInput,
  ListUpdateInput,
  OpenFilesInput,
  PositionMoveInput,
  RenderImageInput,
  RowInsertInput,
  RowUpdateInput,
  SaveFileInput,
  SettingsUpdateInput,
  WorkspaceCreateInput,
  WorkspaceUpdateInput
};
