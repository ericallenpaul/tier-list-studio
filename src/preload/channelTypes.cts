export const tierStudioChannels = {
  app: {
    getVersion: "app:getVersion",
    getPaths: "app:getPaths"
  },
  dialogs: {
    openFiles: "dialogs:openFiles",
    saveFile: "dialogs:saveFile"
  },
  workspaces: {
    list: "workspaces:list",
    create: "workspaces:create",
    update: "workspaces:update"
  },
  lists: {
    list: "lists:list",
    get: "lists:get",
    create: "lists:create",
    update: "lists:update",
    duplicate: "lists:duplicate",
    archive: "lists:archive"
  },
  rows: {
    insert: "rows:insert",
    update: "rows:update",
    reorder: "rows:reorder",
    remove: "rows:remove"
  },
  items: {
    addTextBatch: "items:addTextBatch",
    importAssets: "items:importAssets",
    update: "items:update",
    remove: "items:remove",
    search: "items:search"
  },
  positions: {
    move: "positions:move",
    normalize: "positions:normalize"
  },
  templates: {
    list: "templates:list",
    createFromList: "templates:createFromList",
    instantiate: "templates:instantiate"
  },
  snapshots: {
    create: "snapshots:create",
    list: "snapshots:list",
    restore: "snapshots:restore"
  },
  exports: {
    renderImage: "exports:renderImage",
    exportPackage: "exports:exportPackage",
    exportCsv: "exports:exportCsv"
  },
  backups: {
    create: "backups:create",
    restore: "backups:restore"
  },
  settings: {
    get: "settings:get",
    update: "settings:update"
  },
  ai: {
    getProviders: "ai:getProviders",
    generateItems: "ai:generateItems"
  }
} as const;

export type TierStudioChannelDomain = keyof typeof tierStudioChannels;

type Values<T> = T[keyof T];

export type TierStudioChannel = Values<{
  [Domain in TierStudioChannelDomain]: Values<(typeof tierStudioChannels)[Domain]>;
}>;

export type IpcInvoke = <Result>(channel: TierStudioChannel, payload?: unknown) => Promise<Result>;
