import { z } from "zod";

import {
  colorSchema,
  filePathSchema,
  idSchema,
  jsonRecordSchema,
  nonEmptyStringSchema,
  nonNegativeIntegerSchema,
  optionalTextSchema,
  positiveIntegerSchema
} from "./common.js";

export const workspaceCreateInputSchema = z.object({
  name: nonEmptyStringSchema
});

export const workspaceUpdateInputSchema = z
  .object({
    name: nonEmptyStringSchema.optional(),
    lastOpenedAt: z.string().datetime({ offset: true }).optional()
  })
  .strict();

export const listCreateInputSchema = z.object({
  workspaceId: idSchema,
  name: nonEmptyStringSchema,
  description: optionalTextSchema,
  templateId: idSchema.optional()
});

export const listUpdateInputSchema = z
  .object({
    name: nonEmptyStringSchema.optional(),
    description: optionalTextSchema,
    isArchived: z.boolean().optional(),
    style: jsonRecordSchema.optional()
  })
  .strict();

export const rowInsertInputSchema = z.object({
  label: nonEmptyStringSchema,
  color: colorSchema,
  afterRowId: idSchema.optional(),
  style: jsonRecordSchema.optional()
});

export const rowUpdateInputSchema = z
  .object({
    label: nonEmptyStringSchema.optional(),
    color: colorSchema.optional(),
    style: jsonRecordSchema.optional()
  })
  .strict();

export const itemKindSchema = z.enum(["text", "image", "video", "audio", "file"]);

export const itemUpdateInputSchema = z
  .object({
    label: nonEmptyStringSchema.optional(),
    metadata: jsonRecordSchema.optional(),
    style: jsonRecordSchema.optional()
  })
  .strict();

export const itemSearchInputSchema = z.object({
  text: z.string().trim().min(1),
  workspaceId: idSchema.optional(),
  listId: idSchema.optional(),
  kinds: z.array(itemKindSchema).min(1).optional()
});

export const positionMoveInputSchema = z.object({
  listId: idSchema,
  itemIds: z.array(idSchema).min(1),
  targetRowId: idSchema,
  targetIndex: nonNegativeIntegerSchema
});

export const renderImageInputSchema = z.object({
  listId: idSchema,
  filePath: filePathSchema.optional(),
  format: z.enum(["png", "jpg", "webp"]).default("png"),
  scale: z.number().min(0.25).max(4).default(1),
  width: positiveIntegerSchema.optional(),
  height: positiveIntegerSchema.optional(),
  transparentBackground: z.boolean().default(false)
});

export const openFilesInputSchema = z.object({
  title: z.string().trim().optional(),
  defaultPath: filePathSchema.optional(),
  filters: z
    .array(
      z.object({
        name: nonEmptyStringSchema,
        extensions: z.array(nonEmptyStringSchema).min(1)
      })
    )
    .optional(),
  multiple: z.boolean().default(false)
});

export const saveFileInputSchema = z.object({
  title: z.string().trim().optional(),
  defaultPath: filePathSchema.optional(),
  filters: openFilesInputSchema.shape.filters
});

export const aiGenerateItemsInputSchema = z.object({
  providerId: idSchema,
  prompt: z.string().trim().min(1).max(4000),
  count: z.number().int().min(1).max(200).default(20),
  contextListId: idSchema.optional()
});

export const settingsUpdateInputSchema = z
  .object({
    theme: z.enum(["system", "light", "dark"]).optional(),
    defaultWorkspaceId: idSchema.optional(),
    recentWorkspaceIds: z.array(idSchema).optional(),
    exportDefaults: jsonRecordSchema.optional(),
    ai: z
      .object({
        preferredProviderId: idSchema.optional(),
        enabled: z.boolean().optional()
      })
      .optional()
  })
  .strict();

export const idPayloadSchema = z.object({ id: idSchema });
export const listIdPayloadSchema = z.object({ listId: idSchema });
export const workspaceIdPayloadSchema = z.object({ workspaceId: idSchema });
export const filePathPayloadSchema = z.object({ filePath: filePathSchema });

export const workspaceUpdatePayloadSchema = z.object({
  id: idSchema,
  patch: workspaceUpdateInputSchema
});

export const listUpdatePayloadSchema = z.object({
  id: idSchema,
  patch: listUpdateInputSchema
});

export const rowInsertPayloadSchema = z.object({
  listId: idSchema,
  input: rowInsertInputSchema
});

export const rowUpdatePayloadSchema = z.object({
  rowId: idSchema,
  patch: rowUpdateInputSchema
});

export const rowReorderPayloadSchema = z.object({
  listId: idSchema,
  rowIdsInOrder: z.array(idSchema).min(1)
});

export const rowIdPayloadSchema = z.object({ rowId: idSchema });

export const addTextBatchPayloadSchema = z.object({
  listId: idSchema,
  lines: z.array(nonEmptyStringSchema).min(1)
});

export const importAssetsPayloadSchema = z.object({
  listId: idSchema,
  filePaths: z.array(filePathSchema).min(1)
});

export const itemUpdatePayloadSchema = z.object({
  itemId: idSchema,
  patch: itemUpdateInputSchema
});

export const itemIdPayloadSchema = z.object({ itemId: idSchema });

export const templateCreateFromListPayloadSchema = z.object({
  listId: idSchema,
  name: nonEmptyStringSchema
});

export const templateInstantiatePayloadSchema = z.object({
  templateId: idSchema,
  workspaceId: idSchema
});

export const snapshotCreatePayloadSchema = z.object({
  listId: idSchema,
  label: nonEmptyStringSchema
});

export const snapshotIdPayloadSchema = z.object({
  snapshotId: idSchema
});

export type WorkspaceCreateInput = z.infer<typeof workspaceCreateInputSchema>;
export type WorkspaceUpdateInput = z.infer<typeof workspaceUpdateInputSchema>;
export type ListCreateInput = z.infer<typeof listCreateInputSchema>;
export type ListUpdateInput = z.infer<typeof listUpdateInputSchema>;
export type RowInsertInput = z.infer<typeof rowInsertInputSchema>;
export type RowUpdateInput = z.infer<typeof rowUpdateInputSchema>;
export type ItemUpdateInput = z.infer<typeof itemUpdateInputSchema>;
export type ItemSearchInput = z.infer<typeof itemSearchInputSchema>;
export type PositionMoveInput = z.infer<typeof positionMoveInputSchema>;
export type RenderImageInput = z.infer<typeof renderImageInputSchema>;
export type OpenFilesInput = z.infer<typeof openFilesInputSchema>;
export type SaveFileInput = z.infer<typeof saveFileInputSchema>;
export type AiGenerateItemsInput = z.infer<typeof aiGenerateItemsInputSchema>;
export type SettingsUpdateInput = z.infer<typeof settingsUpdateInputSchema>;
