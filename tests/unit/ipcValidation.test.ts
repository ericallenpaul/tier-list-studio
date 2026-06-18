import { describe, expect, it, vi } from "vitest";

import { registerValidatedHandler, type IpcMainLike } from "../../src/main/ipc/registerHandlers";
import { createTierStudioApi } from "../../src/preload/api.cjs";
import { tierStudioChannels, type TierStudioChannel } from "../../src/preload/channelTypes.cjs";
import type { SettingsUpdateInput } from "../../src/shared/models/api";
import type { TierStudioApi } from "../../src/shared/contracts/tierStudioApi";
import { voidPayloadSchema } from "../../src/shared/schemas/common";
import {
  aiGenerateItemsInputSchema,
  itemUpdatePayloadSchema,
  listCreateInputSchema,
  openFilesInputSchema,
  positionMoveInputSchema,
  renderImageInputSchema
} from "../../src/shared/schemas/inputs";

class FakeIpcMain implements IpcMainLike {
  private readonly handlers = new Map<string, (event: unknown, payload?: unknown) => unknown>();

  handle(channel: string, listener: (event: unknown, payload?: unknown) => unknown) {
    this.handlers.set(channel, listener);
  }

  invoke(channel: TierStudioChannel, payload?: unknown) {
    const handler = this.handlers.get(channel);

    if (!handler) {
      throw new Error(`Missing handler: ${channel}`);
    }

    return handler({ sender: "test" }, payload);
  }
}

describe("registerValidatedHandler", () => {
  it("passes parsed input to the handler for a valid payload", () => {
    const ipcMain = new FakeIpcMain();
    const callback = vi.fn((input) => input);

    registerValidatedHandler(ipcMain, tierStudioChannels.lists.create, listCreateInputSchema, callback);

    const result = ipcMain.invoke(tierStudioChannels.lists.create, {
      workspaceId: "workspace-1",
      name: "Launch Rankings",
      description: "  "
    });

    expect(callback).toHaveBeenCalledWith(
      {
        workspaceId: "workspace-1",
        name: "Launch Rankings",
        description: ""
      },
      { sender: "test" }
    );
    expect(result).toEqual({
      workspaceId: "workspace-1",
      name: "Launch Rankings",
      description: ""
    });
  });

  it("rejects invalid payloads before invoking the handler", () => {
    const ipcMain = new FakeIpcMain();
    const callback = vi.fn();

    registerValidatedHandler(ipcMain, tierStudioChannels.lists.create, listCreateInputSchema, callback);

    expect(() =>
      ipcMain.invoke(tierStudioChannels.lists.create, {
        workspaceId: "",
        name: ""
      })
    ).toThrow();
    expect(callback).not.toHaveBeenCalled();
  });

  it("rejects unexpected payloads for no-payload channels", () => {
    const ipcMain = new FakeIpcMain();
    const callback = vi.fn();

    registerValidatedHandler(ipcMain, tierStudioChannels.app.getVersion, voidPayloadSchema, callback);

    expect(() => ipcMain.invoke(tierStudioChannels.app.getVersion, { unexpected: true })).toThrow();
    expect(callback).not.toHaveBeenCalled();
  });
});

describe("representative IPC input schemas", () => {
  it("parses create list payloads", () => {
    expect(
      listCreateInputSchema.parse({
        workspaceId: "workspace-1",
        name: "Favorites",
        templateId: "template-1"
      })
    ).toEqual({
      workspaceId: "workspace-1",
      name: "Favorites",
      templateId: "template-1"
    });
  });

  it("rejects unexpected keys in IPC-bound object payloads", () => {
    expect(() =>
      listCreateInputSchema.parse({
        workspaceId: "workspace-1",
        name: "Favorites",
        unexpected: true
      })
    ).toThrow();
  });

  it("parses update item payloads", () => {
    expect(
      itemUpdatePayloadSchema.parse({
        itemId: "item-1",
        patch: {
          label: "Updated",
          metadata: { source: "manual" },
          style: { fit: "cover" }
        }
      })
    ).toEqual({
      itemId: "item-1",
      patch: {
        label: "Updated",
        metadata: { source: "manual" },
        style: { fit: "cover" }
      }
    });
  });

  it("parses move item payloads", () => {
    expect(
      positionMoveInputSchema.parse({
        listId: "list-1",
        itemIds: ["item-1", "item-2"],
        targetRowId: null,
        targetIndex: 0
      })
    ).toEqual({
      listId: "list-1",
      itemIds: ["item-1", "item-2"],
      targetRowId: null,
      targetIndex: 0
    });
  });

  it("parses export image payloads with defaults", () => {
    expect(
      renderImageInputSchema.parse({
        listId: "list-1"
      })
    ).toEqual({
      listId: "list-1",
      format: "png",
      scale: 1,
      transparentBackground: false
    });
  });

  it("rejects renderer-controlled export image file paths", () => {
    expect(() =>
      renderImageInputSchema.parse({
        listId: "list-1",
        filePath: "C:\\tmp\\outside.png"
      })
    ).toThrow();
  });

  it("parses AI item generation payloads with defaults", () => {
    expect(
      aiGenerateItemsInputSchema.parse({
        providerId: "provider-1",
        prompt: "Generate launch ideas"
      })
    ).toEqual({
      providerId: "provider-1",
      prompt: "Generate launch ideas",
      count: 20
    });
  });

  it("parses open files payloads with defaults", () => {
    expect(
      openFilesInputSchema.parse({
        filters: [{ name: "Images", extensions: ["png", "jpg"] }]
      })
    ).toEqual({
      filters: [{ name: "Images", extensions: ["png", "jpg"] }],
      multiple: false
    });
  });
});

describe("shared API contract inputs", () => {
  it("keeps settings.update aligned with the Zod-derived input type", () => {
    type SettingsUpdateParameter = Parameters<TierStudioApi["settings"]["update"]>[0];

    const schemaInput: SettingsUpdateInput = { theme: "dark", ai: { enabled: true } };
    const contractInput: SettingsUpdateParameter = schemaInput;

    expect(contractInput).toEqual(schemaInput);
  });
});

describe("preload API builder", () => {
  it("routes every exposed method through the shared channel constants", async () => {
    const calls: Array<{ channel: TierStudioChannel; payload: unknown }> = [];
    const api = createTierStudioApi(async (channel, payload) => {
      calls.push({ channel, payload });
      return undefined;
    });

    await api.app.getVersion();
    await api.app.getPaths();
    await api.dialogs.openFiles({ multiple: true });
    await api.dialogs.saveFile({ defaultPath: "out.png" });
    await api.workspaces.list();
    await api.workspaces.create({ name: "Workspace" });
    await api.workspaces.update("workspace-1", { name: "Updated" });
    await api.lists.list("workspace-1");
    await api.lists.get("list-1");
    await api.lists.create({ workspaceId: "workspace-1", name: "List" });
    await api.lists.update("list-1", { name: "Updated" });
    await api.lists.duplicate("list-1");
    await api.lists.archive("list-1");
    await api.rows.insert("list-1", { label: "S", color: "#ff0000" });
    await api.rows.update("row-1", { label: "A" });
    await api.rows.reorder("list-1", ["row-1"]);
    await api.rows.remove("row-1");
    await api.items.addTextBatch("list-1", ["One"]);
    await api.items.importAssets("list-1", ["C:\\tmp\\one.png"]);
    await api.items.update("item-1", { label: "Updated" });
    await api.items.remove("item-1");
    await api.items.search({ text: "query" });
    await api.positions.move({ listId: "list-1", itemIds: ["item-1"], targetRowId: "row-1", targetIndex: 0 });
    await api.positions.normalize("list-1");
    await api.templates.list();
    await api.templates.createFromList("list-1", "Template");
    await api.templates.instantiate("template-1", "workspace-1");
    await api.snapshots.create("list-1", "Before edit");
    await api.snapshots.list("list-1");
    await api.snapshots.restore("snapshot-1");
    await api.exports.renderImage({ listId: "list-1" });
    await api.exports.exportPackage("list-1");
    await api.exports.exportCsv("list-1");
    await api.backups.create();
    await api.backups.restore("C:\\tmp\\backup.tls");
    await api.settings.get();
    await api.settings.update({ theme: "dark" });
    await api.ai.getProviders();
    await api.ai.generateItems({ providerId: "provider-1", prompt: "Ideas" });

    const expectedChannels = Object.values(tierStudioChannels).flatMap((domain) => Object.values(domain));

    expect(calls.map((call) => call.channel)).toEqual(expectedChannels);
  });
});
