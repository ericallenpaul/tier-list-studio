import { dialog, type App } from "electron";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { ZodType } from "zod";

import { tierStudioChannels, type TierStudioChannel } from "../../preload/channelTypes.cjs";
import type { TierStudioServices } from "../../shared/contracts/tierStudioApi.js";
import {
  addTextBatchPayloadSchema,
  aiGenerateItemsInputSchema,
  filePathPayloadSchema,
  idPayloadSchema,
  importAssetsPayloadSchema,
  itemIdPayloadSchema,
  itemSearchInputSchema,
  itemUpdatePayloadSchema,
  listCreateInputSchema,
  listIdPayloadSchema,
  listUpdatePayloadSchema,
  openFilesInputSchema,
  positionMoveInputSchema,
  renderImageInputSchema,
  rowIdPayloadSchema,
  rowInsertPayloadSchema,
  rowReorderPayloadSchema,
  rowUpdatePayloadSchema,
  saveFileInputSchema,
  settingsUpdateInputSchema,
  snapshotCreatePayloadSchema,
  snapshotIdPayloadSchema,
  templateCreateFromListPayloadSchema,
  templateInstantiatePayloadSchema,
  workspaceCreateInputSchema,
  workspaceIdPayloadSchema,
  workspaceUpdatePayloadSchema
} from "../../shared/schemas/inputs.js";
import { voidPayloadSchema } from "../../shared/schemas/common.js";
import { openDatabase, type SqliteDatabase } from "../services/db/connection.js";
import { runMigrations } from "../services/db/migrations.js";
import { createCoreListServices, type CoreListServices } from "../services/lists/listService.js";
import type { RenderImageInput } from "../../shared/models/api.js";

export interface IpcMainLike {
  handle: (channel: string, listener: (event: unknown, payload?: unknown) => unknown) => void;
}

export type ValidatedHandler<Input, Result> = (input: Input, event: unknown) => Result | Promise<Result>;

export const registerValidatedHandler = <Input, Result>(
  ipcMain: IpcMainLike,
  channel: TierStudioChannel,
  schema: ZodType<Input>,
  handler: ValidatedHandler<Input, Result>
) => {
  ipcMain.handle(channel, (event, payload) => {
    const input = schema.parse(payload);
    return handler(input, event);
  });
};

const notImplemented = (channel: TierStudioChannel) => () => {
  throw new Error(`IPC channel is not implemented yet: ${channel}`);
};

let productionDb: SqliteDatabase | undefined;
let productionCoreServices: CoreListServices | undefined;

const getProductionCoreServices = (app: Pick<App, "getPath">) => {
  if (!productionCoreServices) {
    productionDb = openDatabase({ filePath: join(app.getPath("userData"), "tier-list-studio.sqlite") });
    runMigrations(productionDb);
    productionCoreServices = createCoreListServices(productionDb, { userDataPath: app.getPath("userData") });
  }

  return productionCoreServices;
};

const safeExportFileName = (input: RenderImageInput) => {
  const fallback = `${input.listId}.${input.format}`;
  const requested = input.fileName ?? fallback;
  const sanitized = requested.replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-").replace(/^-+|-+$/g, "");
  const withExtension = sanitized.toLowerCase().endsWith(`.${input.format}`) ? sanitized : `${sanitized}.${input.format}`;

  return withExtension || fallback;
};

const imageDataUrlToBuffer = (dataUrl: string) => {
  const match = /^data:image\/(?:png|jpeg|jpg|webp);base64,(?<data>.+)$/i.exec(dataUrl);
  if (!match?.groups?.data) {
    throw new Error("Export image data must be a base64 image data URL.");
  }

  return Buffer.from(match.groups.data, "base64");
};

const renderImageArtifact = async (app: Pick<App, "getPath">, input: RenderImageInput) => {
  if (!input.imageDataUrl) {
    throw new Error("Renderer image data is required for PNG export.");
  }

  const filePath = input.filePath ?? join(app.getPath("documents"), "Tier List Studio", "Exports", safeExportFileName(input));
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, imageDataUrlToBuffer(input.imageDataUrl));

  return {
    filePath,
    format: input.format,
    createdAt: new Date().toISOString()
  };
};

type RegisterHandlerOptions = {
  services?: Partial<TierStudioServices>;
};

const dialogGrantTtlMs = 5 * 60 * 1000;

const normalizeGrantedPath = (filePath: string) => resolve(filePath);

type DialogGrantTimeout = ReturnType<typeof setTimeout>;
type DialogGrantScope = Map<string, DialogGrantTimeout>;
type DialogGrantStore = Map<string, DialogGrantScope>;

const fallbackSenderKeys = new WeakMap<object, string>();
let fallbackSenderKeyCounter = 0;

const getDialogGrantScopeKey = (event: unknown) => {
  const sender = (event as { sender?: unknown } | undefined)?.sender;
  if (sender && typeof sender === "object") {
    const senderId = (sender as { id?: unknown }).id;
    if (typeof senderId === "number" || typeof senderId === "string") {
      return `webContents:${senderId}`;
    }

    const existingKey = fallbackSenderKeys.get(sender);
    if (existingKey) {
      return existingKey;
    }

    fallbackSenderKeyCounter += 1;
    const fallbackKey = `testSender:${fallbackSenderKeyCounter}`;
    fallbackSenderKeys.set(sender, fallbackKey);
    return fallbackKey;
  }

  return `testSender:${String(sender ?? "unknown")}`;
};

const grantDialogFilePaths = (grantedFilePaths: DialogGrantStore, scopeKey: string, filePaths: string[]) => {
  let scopedGrants = grantedFilePaths.get(scopeKey);
  if (!scopedGrants) {
    scopedGrants = new Map();
    grantedFilePaths.set(scopeKey, scopedGrants);
  }

  for (const filePath of filePaths) {
    const normalized = normalizeGrantedPath(filePath);
    const existingTimeout = scopedGrants.get(normalized);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      scopedGrants.delete(normalized);
      if (scopedGrants.size === 0) {
        grantedFilePaths.delete(scopeKey);
      }
    }, dialogGrantTtlMs);
    if (typeof timeout === "object" && "unref" in timeout) {
      timeout.unref();
    }
    scopedGrants.set(normalized, timeout);
  }
};

const consumeDialogFilePathGrants = (grantedFilePaths: DialogGrantStore, scopeKey: string, filePaths: string[]) => {
  const normalizedPaths = filePaths.map(normalizeGrantedPath);
  const uniquePaths = new Set(normalizedPaths);
  if (uniquePaths.size !== normalizedPaths.length) {
    throw new Error("Import file paths must be unique.");
  }
  const scopedGrants = grantedFilePaths.get(scopeKey);
  const ungrantedPath = normalizedPaths.find((filePath) => !scopedGrants?.has(filePath));
  if (ungrantedPath) {
    throw new Error(`Import file path was not selected through the file picker: ${ungrantedPath}`);
  }
  normalizedPaths.forEach((filePath) => {
    const timeout = scopedGrants?.get(filePath);
    if (timeout) {
      clearTimeout(timeout);
    }
    scopedGrants?.delete(filePath);
  });
  if (scopedGrants?.size === 0) {
    grantedFilePaths.delete(scopeKey);
  }

  return normalizedPaths;
};

export const registerHandlers = (
  ipcMain: IpcMainLike,
  app: Pick<App, "getVersion" | "getPath">,
  options: RegisterHandlerOptions = {}
) => {
  const coreServices = () => (options.services as CoreListServices | undefined) ?? getProductionCoreServices(app);
  const grantedFilePaths: DialogGrantStore = new Map();

  registerValidatedHandler(ipcMain, tierStudioChannels.app.getVersion, voidPayloadSchema, () => app.getVersion());
  registerValidatedHandler(ipcMain, tierStudioChannels.app.getPaths, voidPayloadSchema, () => ({
    userData: app.getPath("userData"),
    documents: app.getPath("documents"),
    temp: app.getPath("temp")
  }));

  registerValidatedHandler(ipcMain, tierStudioChannels.dialogs.openFiles, openFilesInputSchema, async (input, event) => {
    const result = await dialog.showOpenDialog({
      title: input.title,
      defaultPath: input.defaultPath,
      filters: input.filters,
      properties: input.multiple ? ["openFile", "multiSelections"] : ["openFile"]
    });

    if (!result.canceled) {
      grantDialogFilePaths(grantedFilePaths, getDialogGrantScopeKey(event), result.filePaths);
    }

    return {
      canceled: result.canceled,
      filePaths: result.filePaths
    };
  });
  registerValidatedHandler(ipcMain, tierStudioChannels.dialogs.saveFile, saveFileInputSchema, notImplemented(tierStudioChannels.dialogs.saveFile));

  registerValidatedHandler(ipcMain, tierStudioChannels.workspaces.list, voidPayloadSchema, () => coreServices().workspaces.list());
  registerValidatedHandler(ipcMain, tierStudioChannels.workspaces.create, workspaceCreateInputSchema, (input) => coreServices().workspaces.create(input));
  registerValidatedHandler(ipcMain, tierStudioChannels.workspaces.update, workspaceUpdatePayloadSchema, ({ id, patch }) => coreServices().workspaces.update(id, patch));

  registerValidatedHandler(ipcMain, tierStudioChannels.lists.list, workspaceIdPayloadSchema, ({ workspaceId }) => coreServices().lists.list(workspaceId));
  registerValidatedHandler(ipcMain, tierStudioChannels.lists.get, idPayloadSchema, ({ id }) => coreServices().lists.get(id));
  registerValidatedHandler(ipcMain, tierStudioChannels.lists.create, listCreateInputSchema, (input) => coreServices().lists.create(input));
  registerValidatedHandler(ipcMain, tierStudioChannels.lists.update, listUpdatePayloadSchema, ({ id, patch }) => coreServices().lists.update(id, patch));
  registerValidatedHandler(ipcMain, tierStudioChannels.lists.duplicate, idPayloadSchema, ({ id }) => coreServices().lists.duplicate(id));
  registerValidatedHandler(ipcMain, tierStudioChannels.lists.archive, idPayloadSchema, ({ id }) => coreServices().lists.archive(id));

  registerValidatedHandler(ipcMain, tierStudioChannels.rows.insert, rowInsertPayloadSchema, ({ listId, input }) => coreServices().rows.insert(listId, input));
  registerValidatedHandler(ipcMain, tierStudioChannels.rows.update, rowUpdatePayloadSchema, ({ rowId, patch }) => coreServices().rows.update(rowId, patch));
  registerValidatedHandler(ipcMain, tierStudioChannels.rows.reorder, rowReorderPayloadSchema, ({ listId, rowIdsInOrder }) => coreServices().rows.reorder(listId, rowIdsInOrder));
  registerValidatedHandler(ipcMain, tierStudioChannels.rows.remove, rowIdPayloadSchema, ({ rowId }) => coreServices().rows.remove(rowId));

  registerValidatedHandler(ipcMain, tierStudioChannels.items.addTextBatch, addTextBatchPayloadSchema, ({ listId, lines }) => coreServices().items.addTextBatch(listId, lines));
  registerValidatedHandler(ipcMain, tierStudioChannels.items.importAssets, importAssetsPayloadSchema, ({ listId, filePaths }, event) =>
    coreServices().items.importAssets(listId, consumeDialogFilePathGrants(grantedFilePaths, getDialogGrantScopeKey(event), filePaths)));
  registerValidatedHandler(ipcMain, tierStudioChannels.items.update, itemUpdatePayloadSchema, ({ itemId, patch }) => coreServices().items.update(itemId, patch));
  registerValidatedHandler(ipcMain, tierStudioChannels.items.remove, itemIdPayloadSchema, ({ itemId }) => coreServices().items.remove(itemId));
  registerValidatedHandler(ipcMain, tierStudioChannels.items.search, itemSearchInputSchema, (input) => coreServices().items.search(input));

  registerValidatedHandler(ipcMain, tierStudioChannels.positions.move, positionMoveInputSchema, (input) => coreServices().positions.move(input));
  registerValidatedHandler(ipcMain, tierStudioChannels.positions.normalize, listIdPayloadSchema, ({ listId }) => coreServices().positions.normalize(listId));

  registerValidatedHandler(ipcMain, tierStudioChannels.templates.list, voidPayloadSchema, notImplemented(tierStudioChannels.templates.list));
  registerValidatedHandler(ipcMain, tierStudioChannels.templates.createFromList, templateCreateFromListPayloadSchema, notImplemented(tierStudioChannels.templates.createFromList));
  registerValidatedHandler(ipcMain, tierStudioChannels.templates.instantiate, templateInstantiatePayloadSchema, notImplemented(tierStudioChannels.templates.instantiate));

  registerValidatedHandler(ipcMain, tierStudioChannels.snapshots.create, snapshotCreatePayloadSchema, notImplemented(tierStudioChannels.snapshots.create));
  registerValidatedHandler(ipcMain, tierStudioChannels.snapshots.list, listIdPayloadSchema, notImplemented(tierStudioChannels.snapshots.list));
  registerValidatedHandler(ipcMain, tierStudioChannels.snapshots.restore, snapshotIdPayloadSchema, notImplemented(tierStudioChannels.snapshots.restore));

  registerValidatedHandler(ipcMain, tierStudioChannels.exports.renderImage, renderImageInputSchema, (input) => renderImageArtifact(app, input));
  registerValidatedHandler(ipcMain, tierStudioChannels.exports.exportPackage, listIdPayloadSchema, notImplemented(tierStudioChannels.exports.exportPackage));
  registerValidatedHandler(ipcMain, tierStudioChannels.exports.exportCsv, listIdPayloadSchema, notImplemented(tierStudioChannels.exports.exportCsv));

  registerValidatedHandler(ipcMain, tierStudioChannels.backups.create, voidPayloadSchema, notImplemented(tierStudioChannels.backups.create));
  registerValidatedHandler(ipcMain, tierStudioChannels.backups.restore, filePathPayloadSchema, notImplemented(tierStudioChannels.backups.restore));

  registerValidatedHandler(ipcMain, tierStudioChannels.settings.get, voidPayloadSchema, notImplemented(tierStudioChannels.settings.get));
  registerValidatedHandler(ipcMain, tierStudioChannels.settings.update, settingsUpdateInputSchema, notImplemented(tierStudioChannels.settings.update));

  registerValidatedHandler(ipcMain, tierStudioChannels.ai.getProviders, voidPayloadSchema, notImplemented(tierStudioChannels.ai.getProviders));
  registerValidatedHandler(ipcMain, tierStudioChannels.ai.generateItems, aiGenerateItemsInputSchema, notImplemented(tierStudioChannels.ai.generateItems));
};
