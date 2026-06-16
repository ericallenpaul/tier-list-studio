import { contextBridge, ipcRenderer } from "electron";
import type { TierStudioApi } from "../shared/contracts/tierStudioApi.js";

const tierStudioApi: TierStudioApi = {
  app: {
    getVersion: () => ipcRenderer.invoke("app:getVersion") as Promise<string>,
    getPaths: () => ipcRenderer.invoke("app:getPaths") as ReturnType<TierStudioApi["app"]["getPaths"]>
  },
  dialogs: {
    openFiles: (options) => ipcRenderer.invoke("dialogs:openFiles", options) as ReturnType<TierStudioApi["dialogs"]["openFiles"]>,
    saveFile: (options) => ipcRenderer.invoke("dialogs:saveFile", options) as ReturnType<TierStudioApi["dialogs"]["saveFile"]>
  },
  workspaces: {
    list: () => ipcRenderer.invoke("workspaces:list") as ReturnType<TierStudioApi["workspaces"]["list"]>,
    create: (input) => ipcRenderer.invoke("workspaces:create", input) as ReturnType<TierStudioApi["workspaces"]["create"]>,
    update: (id, patch) => ipcRenderer.invoke("workspaces:update", { id, patch }) as ReturnType<TierStudioApi["workspaces"]["update"]>
  },
  lists: {
    list: (workspaceId) => ipcRenderer.invoke("lists:list", { workspaceId }) as ReturnType<TierStudioApi["lists"]["list"]>,
    get: (id) => ipcRenderer.invoke("lists:get", { id }) as ReturnType<TierStudioApi["lists"]["get"]>,
    create: (input) => ipcRenderer.invoke("lists:create", input) as ReturnType<TierStudioApi["lists"]["create"]>,
    update: (id, patch) => ipcRenderer.invoke("lists:update", { id, patch }) as ReturnType<TierStudioApi["lists"]["update"]>,
    duplicate: (id) => ipcRenderer.invoke("lists:duplicate", { id }) as ReturnType<TierStudioApi["lists"]["duplicate"]>,
    archive: (id) => ipcRenderer.invoke("lists:archive", { id }) as ReturnType<TierStudioApi["lists"]["archive"]>
  },
  rows: {
    insert: (listId, input) => ipcRenderer.invoke("rows:insert", { listId, input }) as ReturnType<TierStudioApi["rows"]["insert"]>,
    update: (rowId, patch) => ipcRenderer.invoke("rows:update", { rowId, patch }) as ReturnType<TierStudioApi["rows"]["update"]>,
    reorder: (listId, rowIdsInOrder) => ipcRenderer.invoke("rows:reorder", { listId, rowIdsInOrder }) as ReturnType<TierStudioApi["rows"]["reorder"]>,
    remove: (rowId) => ipcRenderer.invoke("rows:remove", { rowId }) as ReturnType<TierStudioApi["rows"]["remove"]>
  },
  items: {
    addTextBatch: (listId, lines) => ipcRenderer.invoke("items:addTextBatch", { listId, lines }) as ReturnType<TierStudioApi["items"]["addTextBatch"]>,
    importAssets: (listId, filePaths) => ipcRenderer.invoke("items:importAssets", { listId, filePaths }) as ReturnType<TierStudioApi["items"]["importAssets"]>,
    update: (itemId, patch) => ipcRenderer.invoke("items:update", { itemId, patch }) as ReturnType<TierStudioApi["items"]["update"]>,
    remove: (itemId) => ipcRenderer.invoke("items:remove", { itemId }) as ReturnType<TierStudioApi["items"]["remove"]>,
    search: (query) => ipcRenderer.invoke("items:search", query) as ReturnType<TierStudioApi["items"]["search"]>
  },
  positions: {
    move: (input) => ipcRenderer.invoke("positions:move", input) as ReturnType<TierStudioApi["positions"]["move"]>,
    normalize: (listId) => ipcRenderer.invoke("positions:normalize", { listId }) as ReturnType<TierStudioApi["positions"]["normalize"]>
  },
  templates: {
    list: () => ipcRenderer.invoke("templates:list") as ReturnType<TierStudioApi["templates"]["list"]>,
    createFromList: (listId, name) => ipcRenderer.invoke("templates:createFromList", { listId, name }) as ReturnType<TierStudioApi["templates"]["createFromList"]>,
    instantiate: (templateId, workspaceId) => ipcRenderer.invoke("templates:instantiate", { templateId, workspaceId }) as ReturnType<TierStudioApi["templates"]["instantiate"]>
  },
  snapshots: {
    create: (listId, label) => ipcRenderer.invoke("snapshots:create", { listId, label }) as ReturnType<TierStudioApi["snapshots"]["create"]>,
    list: (listId) => ipcRenderer.invoke("snapshots:list", { listId }) as ReturnType<TierStudioApi["snapshots"]["list"]>,
    restore: (snapshotId) => ipcRenderer.invoke("snapshots:restore", { snapshotId }) as ReturnType<TierStudioApi["snapshots"]["restore"]>
  },
  exports: {
    renderImage: (input) => ipcRenderer.invoke("exports:renderImage", input) as ReturnType<TierStudioApi["exports"]["renderImage"]>,
    exportPackage: (listId) => ipcRenderer.invoke("exports:exportPackage", { listId }) as ReturnType<TierStudioApi["exports"]["exportPackage"]>,
    exportCsv: (listId) => ipcRenderer.invoke("exports:exportCsv", { listId }) as ReturnType<TierStudioApi["exports"]["exportCsv"]>
  },
  backups: {
    create: () => ipcRenderer.invoke("backups:create") as ReturnType<TierStudioApi["backups"]["create"]>,
    restore: (filePath) => ipcRenderer.invoke("backups:restore", { filePath }) as ReturnType<TierStudioApi["backups"]["restore"]>
  },
  settings: {
    get: () => ipcRenderer.invoke("settings:get") as ReturnType<TierStudioApi["settings"]["get"]>,
    update: (patch) => ipcRenderer.invoke("settings:update", patch) as ReturnType<TierStudioApi["settings"]["update"]>
  },
  ai: {
    getProviders: () => ipcRenderer.invoke("ai:getProviders") as ReturnType<TierStudioApi["ai"]["getProviders"]>,
    generateItems: (input) => ipcRenderer.invoke("ai:generateItems", input) as ReturnType<TierStudioApi["ai"]["generateItems"]>
  }
};

contextBridge.exposeInMainWorld("tierStudio", tierStudioApi);
