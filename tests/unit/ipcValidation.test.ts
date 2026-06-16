import { describe, expect, it, vi } from "vitest";

import { registerValidatedHandler, type IpcMainLike } from "../../src/main/ipc/registerHandlers";
import { tierStudioChannels, type TierStudioChannel } from "../../src/preload/channelTypes";
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
        targetRowId: "row-1",
        targetIndex: 0
      })
    ).toEqual({
      listId: "list-1",
      itemIds: ["item-1", "item-2"],
      targetRowId: "row-1",
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
