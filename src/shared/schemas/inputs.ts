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
}).strict();

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
}).strict();

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
}).strict();

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
}).strict();

export const positionMoveInputSchema = z.object({
  listId: idSchema,
  itemIds: z.array(idSchema).min(1),
  targetRowId: idSchema.nullable(),
  targetIndex: nonNegativeIntegerSchema
}).strict();

export const renderImageInputSchema = z.object({
  listId: idSchema,
  filePath: filePathSchema.optional(),
  fileName: nonEmptyStringSchema.optional(),
  imageDataUrl: z.string().trim().startsWith("data:image/").optional(),
  format: z.enum(["png", "jpg", "webp"]).default("png"),
  scale: z.number().min(0.25).max(4).default(1),
  width: positiveIntegerSchema.optional(),
  height: positiveIntegerSchema.optional(),
  transparentBackground: z.boolean().default(false)
}).strict();

export const openFilesInputSchema = z.object({
  title: z.string().trim().optional(),
  defaultPath: filePathSchema.optional(),
  filters: z
    .array(
      z.object({
        name: nonEmptyStringSchema,
        extensions: z.array(nonEmptyStringSchema).min(1)
      }).strict()
    )
    .optional(),
  multiple: z.boolean().default(false)
}).strict();

export const saveFileInputSchema = z.object({
  title: z.string().trim().optional(),
  defaultPath: filePathSchema.optional(),
  filters: openFilesInputSchema.shape.filters
}).strict();

export const aiGenerateItemsInputSchema = z.object({
  providerId: idSchema,
  prompt: z.string().trim().min(1).max(4000),
  count: z.number().int().min(1).max(200).default(20),
  contextListId: idSchema.optional()
}).strict();

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
      .strict()
      .optional()
  })
  .strict();

export const idPayloadSchema = z.object({ id: idSchema }).strict();
export const listIdPayloadSchema = z.object({ listId: idSchema }).strict();
export const workspaceIdPayloadSchema = z.object({ workspaceId: idSchema }).strict();
export const filePathPayloadSchema = z.object({ filePath: filePathSchema }).strict();

export const workspaceUpdatePayloadSchema = z.object({
  id: idSchema,
  patch: workspaceUpdateInputSchema
}).strict();

export const listUpdatePayloadSchema = z.object({
  id: idSchema,
  patch: listUpdateInputSchema
}).strict();

export const rowInsertPayloadSchema = z.object({
  listId: idSchema,
  input: rowInsertInputSchema
}).strict();

export const rowUpdatePayloadSchema = z.object({
  rowId: idSchema,
  patch: rowUpdateInputSchema
}).strict();

export const rowReorderPayloadSchema = z.object({
  listId: idSchema,
  rowIdsInOrder: z.array(idSchema).min(1)
}).strict();

export const rowIdPayloadSchema = z.object({ rowId: idSchema }).strict();

export const addTextBatchPayloadSchema = z.object({
  listId: idSchema,
  lines: z.array(z.string()).min(1)
}).strict();

export const importAssetsPayloadSchema = z.object({
  listId: idSchema,
  filePaths: z.array(filePathSchema).min(1)
}).strict();

export const itemUpdatePayloadSchema = z.object({
  itemId: idSchema,
  patch: itemUpdateInputSchema
}).strict();

export const itemIdPayloadSchema = z.object({ itemId: idSchema }).strict();

export const templateCreateFromListPayloadSchema = z.object({
  listId: idSchema,
  name: nonEmptyStringSchema
}).strict();

export const templateInstantiatePayloadSchema = z.object({
  templateId: idSchema,
  workspaceId: idSchema
}).strict();

export const snapshotCreatePayloadSchema = z.object({
  listId: idSchema,
  label: nonEmptyStringSchema
}).strict();

export const snapshotIdPayloadSchema = z.object({
  snapshotId: idSchema
}).strict();

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
