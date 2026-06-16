import { z } from "zod";

export const idSchema = z.string().trim().min(1);
export const isoTimestampSchema = z.string().datetime({ offset: true });
export const jsonRecordSchema = z.record(z.string(), z.unknown());
export const nonEmptyStringSchema = z.string().trim().min(1);
export const filePathSchema = z.string().trim().min(1);

export const optionalTextSchema = z.string().trim().optional();

export const colorSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);

export const positiveIntegerSchema = z.number().int().positive();
export const nonNegativeIntegerSchema = z.number().int().min(0);
