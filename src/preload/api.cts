import type { TierStudioApi } from "../shared/contracts/tierStudioApi.js";
import { tierStudioChannels, type IpcInvoke } from "./channelTypes.cjs";

export const createTierStudioApi = (invoke: IpcInvoke): TierStudioApi => ({
  app: {
    getVersion: () => invoke(tierStudioChannels.app.getVersion),
    getPaths: () => invoke(tierStudioChannels.app.getPaths)
  },
  dialogs: {
    openFiles: (options) => invoke(tierStudioChannels.dialogs.openFiles, options),
    saveFile: (options) => invoke(tierStudioChannels.dialogs.saveFile, options)
  },
  workspaces: {
    list: () => invoke(tierStudioChannels.workspaces.list),
    create: (input) => invoke(tierStudioChannels.workspaces.create, input),
    update: (id, patch) => invoke(tierStudioChannels.workspaces.update, { id, patch })
  },
  lists: {
    list: (workspaceId) => invoke(tierStudioChannels.lists.list, { workspaceId }),
    get: (id) => invoke(tierStudioChannels.lists.get, { id }),
    create: (input) => invoke(tierStudioChannels.lists.create, input),
    update: (id, patch) => invoke(tierStudioChannels.lists.update, { id, patch }),
    duplicate: (id) => invoke(tierStudioChannels.lists.duplicate, { id }),
    archive: (id) => invoke(tierStudioChannels.lists.archive, { id })
  },
  rows: {
    insert: (listId, input) => invoke(tierStudioChannels.rows.insert, { listId, input }),
    update: (rowId, patch) => invoke(tierStudioChannels.rows.update, { rowId, patch }),
    reorder: (listId, rowIdsInOrder) => invoke(tierStudioChannels.rows.reorder, { listId, rowIdsInOrder }),
    remove: (rowId) => invoke(tierStudioChannels.rows.remove, { rowId })
  },
  items: {
    addTextBatch: (listId, lines) => invoke(tierStudioChannels.items.addTextBatch, { listId, lines }),
    importAssets: (listId, filePaths) => invoke(tierStudioChannels.items.importAssets, { listId, filePaths }),
    update: (itemId, patch) => invoke(tierStudioChannels.items.update, { itemId, patch }),
    remove: (itemId) => invoke(tierStudioChannels.items.remove, { itemId }),
    search: (query) => invoke(tierStudioChannels.items.search, query)
  },
  assets: {
    getMediaDataUrl: (assetId) => invoke(tierStudioChannels.assets.getMediaDataUrl, { id: assetId })
  },
  positions: {
    move: (input) => invoke(tierStudioChannels.positions.move, input),
    normalize: (listId) => invoke(tierStudioChannels.positions.normalize, { listId })
  },
  templates: {
    list: () => invoke(tierStudioChannels.templates.list),
    createFromList: (listId, name) => invoke(tierStudioChannels.templates.createFromList, { listId, name }),
    instantiate: (templateId, workspaceId) => invoke(tierStudioChannels.templates.instantiate, { templateId, workspaceId })
  },
  snapshots: {
    create: (listId, label) => invoke(tierStudioChannels.snapshots.create, { listId, label }),
    list: (listId) => invoke(tierStudioChannels.snapshots.list, { listId }),
    restore: (snapshotId) => invoke(tierStudioChannels.snapshots.restore, { snapshotId })
  },
  exports: {
    renderImage: (input) => invoke(tierStudioChannels.exports.renderImage, input),
    exportPackage: (listId) => invoke(tierStudioChannels.exports.exportPackage, { listId }),
    exportCsv: (listId) => invoke(tierStudioChannels.exports.exportCsv, { listId })
  },
  backups: {
    create: () => invoke(tierStudioChannels.backups.create),
    restore: (filePath) => invoke(tierStudioChannels.backups.restore, { filePath })
  },
  settings: {
    get: () => invoke(tierStudioChannels.settings.get),
    update: (patch) => invoke(tierStudioChannels.settings.update, patch)
  },
  ai: {
    getProviders: () => invoke(tierStudioChannels.ai.getProviders),
    generateItems: (input) => invoke(tierStudioChannels.ai.generateItems, input)
  }
});
