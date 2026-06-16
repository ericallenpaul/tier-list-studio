import type { App } from "electron";
import type { ZodType } from "zod";

import { tierStudioChannels, type TierStudioChannel } from "../../preload/channelTypes.js";
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

export interface IpcMainLike {
  handle: (channel: string, listener: (event: unknown, payload?: unknown) => unknown) => void;
}

export type ValidatedHandler<Input, Result> = (input: Input, event: unknown) => Result | Promise<Result>;

export const registerValidatedHandler = <Input, Result>(
  ipcMain: IpcMainLike,
  channel: TierStudioChannel,
  schema: ZodType<Input> | undefined,
  handler: ValidatedHandler<Input, Result>
) => {
  ipcMain.handle(channel, (event, payload) => {
    const input = schema ? schema.parse(payload) : (undefined as Input);
    return handler(input, event);
  });
};

const notImplemented = (channel: TierStudioChannel) => () => {
  throw new Error(`IPC channel is not implemented yet: ${channel}`);
};

export const registerHandlers = (ipcMain: IpcMainLike, app: Pick<App, "getVersion" | "getPath">) => {
  registerValidatedHandler(ipcMain, tierStudioChannels.app.getVersion, undefined, () => app.getVersion());
  registerValidatedHandler(ipcMain, tierStudioChannels.app.getPaths, undefined, () => ({
    userData: app.getPath("userData"),
    documents: app.getPath("documents"),
    temp: app.getPath("temp")
  }));

  registerValidatedHandler(ipcMain, tierStudioChannels.dialogs.openFiles, openFilesInputSchema, notImplemented(tierStudioChannels.dialogs.openFiles));
  registerValidatedHandler(ipcMain, tierStudioChannels.dialogs.saveFile, saveFileInputSchema, notImplemented(tierStudioChannels.dialogs.saveFile));

  registerValidatedHandler(ipcMain, tierStudioChannels.workspaces.list, undefined, notImplemented(tierStudioChannels.workspaces.list));
  registerValidatedHandler(ipcMain, tierStudioChannels.workspaces.create, workspaceCreateInputSchema, notImplemented(tierStudioChannels.workspaces.create));
  registerValidatedHandler(ipcMain, tierStudioChannels.workspaces.update, workspaceUpdatePayloadSchema, notImplemented(tierStudioChannels.workspaces.update));

  registerValidatedHandler(ipcMain, tierStudioChannels.lists.list, workspaceIdPayloadSchema, notImplemented(tierStudioChannels.lists.list));
  registerValidatedHandler(ipcMain, tierStudioChannels.lists.get, idPayloadSchema, notImplemented(tierStudioChannels.lists.get));
  registerValidatedHandler(ipcMain, tierStudioChannels.lists.create, listCreateInputSchema, notImplemented(tierStudioChannels.lists.create));
  registerValidatedHandler(ipcMain, tierStudioChannels.lists.update, listUpdatePayloadSchema, notImplemented(tierStudioChannels.lists.update));
  registerValidatedHandler(ipcMain, tierStudioChannels.lists.duplicate, idPayloadSchema, notImplemented(tierStudioChannels.lists.duplicate));
  registerValidatedHandler(ipcMain, tierStudioChannels.lists.archive, idPayloadSchema, notImplemented(tierStudioChannels.lists.archive));

  registerValidatedHandler(ipcMain, tierStudioChannels.rows.insert, rowInsertPayloadSchema, notImplemented(tierStudioChannels.rows.insert));
  registerValidatedHandler(ipcMain, tierStudioChannels.rows.update, rowUpdatePayloadSchema, notImplemented(tierStudioChannels.rows.update));
  registerValidatedHandler(ipcMain, tierStudioChannels.rows.reorder, rowReorderPayloadSchema, notImplemented(tierStudioChannels.rows.reorder));
  registerValidatedHandler(ipcMain, tierStudioChannels.rows.remove, rowIdPayloadSchema, notImplemented(tierStudioChannels.rows.remove));

  registerValidatedHandler(ipcMain, tierStudioChannels.items.addTextBatch, addTextBatchPayloadSchema, notImplemented(tierStudioChannels.items.addTextBatch));
  registerValidatedHandler(ipcMain, tierStudioChannels.items.importAssets, importAssetsPayloadSchema, notImplemented(tierStudioChannels.items.importAssets));
  registerValidatedHandler(ipcMain, tierStudioChannels.items.update, itemUpdatePayloadSchema, notImplemented(tierStudioChannels.items.update));
  registerValidatedHandler(ipcMain, tierStudioChannels.items.remove, itemIdPayloadSchema, notImplemented(tierStudioChannels.items.remove));
  registerValidatedHandler(ipcMain, tierStudioChannels.items.search, itemSearchInputSchema, notImplemented(tierStudioChannels.items.search));

  registerValidatedHandler(ipcMain, tierStudioChannels.positions.move, positionMoveInputSchema, notImplemented(tierStudioChannels.positions.move));
  registerValidatedHandler(ipcMain, tierStudioChannels.positions.normalize, listIdPayloadSchema, notImplemented(tierStudioChannels.positions.normalize));

  registerValidatedHandler(ipcMain, tierStudioChannels.templates.list, undefined, notImplemented(tierStudioChannels.templates.list));
  registerValidatedHandler(ipcMain, tierStudioChannels.templates.createFromList, templateCreateFromListPayloadSchema, notImplemented(tierStudioChannels.templates.createFromList));
  registerValidatedHandler(ipcMain, tierStudioChannels.templates.instantiate, templateInstantiatePayloadSchema, notImplemented(tierStudioChannels.templates.instantiate));

  registerValidatedHandler(ipcMain, tierStudioChannels.snapshots.create, snapshotCreatePayloadSchema, notImplemented(tierStudioChannels.snapshots.create));
  registerValidatedHandler(ipcMain, tierStudioChannels.snapshots.list, listIdPayloadSchema, notImplemented(tierStudioChannels.snapshots.list));
  registerValidatedHandler(ipcMain, tierStudioChannels.snapshots.restore, snapshotIdPayloadSchema, notImplemented(tierStudioChannels.snapshots.restore));

  registerValidatedHandler(ipcMain, tierStudioChannels.exports.renderImage, renderImageInputSchema, notImplemented(tierStudioChannels.exports.renderImage));
  registerValidatedHandler(ipcMain, tierStudioChannels.exports.exportPackage, listIdPayloadSchema, notImplemented(tierStudioChannels.exports.exportPackage));
  registerValidatedHandler(ipcMain, tierStudioChannels.exports.exportCsv, listIdPayloadSchema, notImplemented(tierStudioChannels.exports.exportCsv));

  registerValidatedHandler(ipcMain, tierStudioChannels.backups.create, undefined, notImplemented(tierStudioChannels.backups.create));
  registerValidatedHandler(ipcMain, tierStudioChannels.backups.restore, filePathPayloadSchema, notImplemented(tierStudioChannels.backups.restore));

  registerValidatedHandler(ipcMain, tierStudioChannels.settings.get, undefined, notImplemented(tierStudioChannels.settings.get));
  registerValidatedHandler(ipcMain, tierStudioChannels.settings.update, settingsUpdateInputSchema, notImplemented(tierStudioChannels.settings.update));

  registerValidatedHandler(ipcMain, tierStudioChannels.ai.getProviders, undefined, notImplemented(tierStudioChannels.ai.getProviders));
  registerValidatedHandler(ipcMain, tierStudioChannels.ai.generateItems, aiGenerateItemsInputSchema, notImplemented(tierStudioChannels.ai.generateItems));
};
