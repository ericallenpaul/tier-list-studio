import type {
  AiGenerateItemsInput,
  AppPaths,
  GeneratedItemsResult,
  ItemSearchInput,
  ItemUpdateInput,
  ListCreateInput,
  ListUpdateInput,
  OpenFilesOptions,
  OpenFilesResult,
  PositionMoveInput,
  RenderImageInput,
  RowInsertInput,
  RowUpdateInput,
  SaveFileOptions,
  SaveFileResult,
  SettingsUpdateInput,
  TierStudioDomainResults,
  WorkspaceCreateInput,
  WorkspaceUpdateInput
} from "../models/api.js";
import type { AiProvider, BackupArtifact, ExportArtifact, TierItem, TierList, TierPosition, TierRow, TierTemplate, Snapshot, UserSettings, Workspace } from "../models/entities.js";

export interface TierStudioApi {
  app: {
    getVersion: () => Promise<string>;
    getPaths: () => Promise<AppPaths>;
  };
  dialogs: {
    openFiles: (options: OpenFilesOptions) => Promise<OpenFilesResult>;
    saveFile: (options: SaveFileOptions) => Promise<SaveFileResult>;
  };
  workspaces: {
    list: () => Promise<Workspace[]>;
    create: (input: WorkspaceCreateInput) => Promise<Workspace>;
    update: (id: string, patch: WorkspaceUpdateInput) => Promise<Workspace>;
  };
  lists: {
    list: (workspaceId: string) => Promise<TierList[]>;
    get: (id: string) => Promise<TierList | undefined>;
    create: (input: ListCreateInput) => Promise<TierList>;
    update: (id: string, patch: ListUpdateInput) => Promise<TierList>;
    duplicate: (id: string) => Promise<TierList>;
    archive: (id: string) => Promise<TierList>;
  };
  rows: {
    insert: (listId: string, input: RowInsertInput) => Promise<TierRow>;
    update: (rowId: string, patch: RowUpdateInput) => Promise<TierRow>;
    reorder: (listId: string, rowIdsInOrder: string[]) => Promise<TierRow[]>;
    remove: (rowId: string) => Promise<void>;
  };
  items: {
    addTextBatch: (listId: string, lines: string[]) => Promise<TierItem[]>;
    importAssets: (listId: string, filePaths: string[]) => Promise<TierItem[]>;
    update: (itemId: string, patch: ItemUpdateInput) => Promise<TierItem>;
    remove: (itemId: string) => Promise<void>;
    search: (query: ItemSearchInput) => Promise<TierItem[]>;
  };
  positions: {
    move: (input: PositionMoveInput) => Promise<TierPosition[]>;
    normalize: (listId: string) => Promise<TierPosition[]>;
  };
  templates: {
    list: () => Promise<TierTemplate[]>;
    createFromList: (listId: string, name: string) => Promise<TierTemplate>;
    instantiate: (templateId: string, workspaceId: string) => Promise<TierList>;
  };
  snapshots: {
    create: (listId: string, label: string) => Promise<Snapshot>;
    list: (listId: string) => Promise<Snapshot[]>;
    restore: (snapshotId: string) => Promise<TierList>;
  };
  exports: {
    renderImage: (input: RenderImageInput) => Promise<ExportArtifact>;
    exportPackage: (listId: string) => Promise<ExportArtifact>;
    exportCsv: (listId: string) => Promise<ExportArtifact>;
  };
  backups: {
    create: () => Promise<BackupArtifact>;
    restore: (filePath: string) => Promise<void>;
  };
  settings: {
    get: () => Promise<UserSettings>;
    update: (patch: SettingsUpdateInput) => Promise<UserSettings>;
  };
  ai: {
    getProviders: () => Promise<AiProvider[]>;
    generateItems: (input: AiGenerateItemsInput) => Promise<GeneratedItemsResult>;
  };
}

export type TierStudioServices = {
  [Domain in keyof TierStudioApi]: {
    [Method in keyof TierStudioApi[Domain]]: TierStudioApi[Domain][Method] extends (
      ...args: infer Args
    ) => Promise<infer Result>
      ? (...args: Args) => Promise<Result> | Result
      : never;
  };
};

export type TierStudioResult<Domain extends keyof TierStudioDomainResults, Method extends keyof TierStudioDomainResults[Domain]> =
  TierStudioDomainResults[Domain][Method];
