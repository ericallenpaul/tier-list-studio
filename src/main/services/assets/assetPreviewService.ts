import { readFile, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";

import type { ManagedAssetPreview } from "../../../shared/models/api.js";
import type { MediaAssetRecord } from "../repositories/types.js";

type CreateManagedAssetPreviewOptions = {
  assetId: string;
  asset?: MediaAssetRecord;
  userDataPath: string;
  maxPreviewBytes?: number;
};

const defaultMaxPreviewBytes = 25 * 1024 * 1024;

export const createManagedAssetPreview = async ({
  assetId,
  asset,
  userDataPath,
  maxPreviewBytes = defaultMaxPreviewBytes
}: CreateManagedAssetPreviewOptions): Promise<ManagedAssetPreview> => {
  if (!asset) {
    return {
      status: "unavailable",
      assetId,
      kind: "file",
      reason: "Media asset is not registered in this app profile."
    };
  }

  const kind = asset.mimeType.startsWith("image/")
    ? "image"
    : asset.mimeType.startsWith("video/")
      ? "video"
      : "file";

  if (kind === "file") {
    return {
      status: "unavailable",
      assetId,
      kind,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      reason: "Media asset type cannot be previewed."
    };
  }

  const managedPath = resolveManagedAssetPath(userDataPath, asset.managedRelPath);
  if (!managedPath) {
    return {
      status: "unavailable",
      assetId,
      kind,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      reason: "Managed asset path is outside the app asset store."
    };
  }

  try {
    const fileStat = await stat(managedPath);
    if (fileStat.size > maxPreviewBytes) {
      return {
        status: "unavailable",
        assetId,
        kind,
        originalName: asset.originalName,
        mimeType: asset.mimeType,
        reason: "Managed asset is too large for preview."
      };
    }

    const content = await readFile(managedPath);
    return {
      status: "available",
      assetId,
      kind,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      dataUrl: `data:${asset.mimeType};base64,${content.toString("base64")}`
    };
  } catch {
    return {
      status: "unavailable",
      assetId,
      kind,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      reason: "Managed asset file is not available."
    };
  }
};

const resolveManagedAssetPath = (userDataPath: string, managedRelPath: string) => {
  const userDataRoot = resolve(userDataPath);
  const root = resolve(userDataRoot, "assets");
  const candidate = resolve(userDataRoot, managedRelPath);
  if (!candidate.startsWith(`${root}${sep}`)) {
    return undefined;
  }

  return candidate;
};
