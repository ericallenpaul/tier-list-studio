import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import type { Stats } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";

import type { TierListDetail } from "../../../shared/models/api.js";
import type { ExportArtifact } from "../../../shared/models/entities.js";
import type { MediaAssetRecord } from "../repositories/types.js";

type ExportPackageOptions = {
  appVersion: string;
  documentsPath: string;
  assetRecords?: MediaAssetRecord[];
  filePath?: string;
  fileSystem?: PackageAssetFileSystem;
  maxEmbeddedAssetBytes?: number;
  maxTotalEmbeddedAssetBytes?: number;
  userDataPath?: string;
};

export const exportPackageArtifact = async (
  list: TierListDetail,
  options: ExportPackageOptions
): Promise<ExportArtifact> => {
  const filePath = options.filePath ?? join(options.documentsPath, "Tier List Studio", "Exports", `${safeFileBase(list.name)}.json`);
  const createdAt = new Date().toISOString();
  const assets = await collectPackageAssets(list, options);
  const packageData = createPackagePayload(list, {
    appVersion: options.appVersion,
    exportedAt: createdAt,
    assets
  });

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(packageData, null, 2)}\n`, "utf8");

  return {
    filePath,
    format: "package",
    createdAt
  };
};

export const createPackagePayload = (
  list: TierListDetail,
  metadata: { appVersion: string; exportedAt: string; assets?: PackageAsset[] }
) => ({
  schemaVersion: 1,
  app: {
    name: "Tier List Studio",
    version: metadata.appVersion
  },
  exportedAt: metadata.exportedAt,
  board: {
    id: list.id,
    workspaceId: list.workspaceId,
    name: list.name,
    description: list.description ?? "",
    style: list.style,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt
  },
  template: {
    name: list.name,
    rows: [...(list.rows ?? [])]
      .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id))
      .map((row) => ({
        label: row.label,
        color: row.color,
        style: row.style
      })),
    style: list.style
  },
  rows: [...(list.rows ?? [])].sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id)),
  items: [...(list.items ?? [])].sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)),
  positions: [...(list.positions ?? [])].sort((left, right) =>
    (left.rowId ?? "pool").localeCompare(right.rowId ?? "pool")
      || left.sortOrder - right.sortOrder
      || left.itemId.localeCompare(right.itemId)
  ),
  assets: metadata.assets ?? []
});

const safeFileBase = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tier-list";

type PackageAssetFile = {
  kind: "embedded" | "local-reference";
  managedRelPath: string;
  managedPath?: string;
  managedPathExists: boolean;
  sourcePath: string;
  sourcePathExists: boolean;
  byteSize: number;
  encoding?: "base64";
  contentBase64?: string;
  reason?: string;
};

export type PackageAsset = Omit<MediaAssetRecord, "sourcePath"> & {
  sourcePath: string;
  file: PackageAssetFile;
};

const defaultMaxEmbeddedAssetBytes = 50 * 1024 * 1024;
const defaultMaxTotalEmbeddedAssetBytes = 200 * 1024 * 1024;

type PackageAssetFileSystem = {
  readFile: typeof readFile;
  stat: typeof stat;
};

type PackageAssetStatResult =
  | { exists: true; stat: Stats }
  | { exists: false; error?: unknown };

const defaultFileSystem: PackageAssetFileSystem = {
  readFile,
  stat
};

const collectPackageAssets = async (
  list: TierListDetail,
  options: Pick<ExportPackageOptions, "assetRecords" | "fileSystem" | "maxEmbeddedAssetBytes" | "maxTotalEmbeddedAssetBytes" | "userDataPath">
): Promise<PackageAsset[]> => {
  const referencedAssetIds = new Set((list.items ?? [])
    .map((item) => item.assetId)
    .filter((assetId): assetId is string => typeof assetId === "string" && assetId.length > 0));
  if (referencedAssetIds.size === 0) {
    return [];
  }

  const assets = (options.assetRecords ?? [])
    .filter((asset) => referencedAssetIds.has(asset.id))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));

  const packageAssets: PackageAsset[] = [];
  let totalEmbeddedAssetBytes = 0;
  const maxTotalEmbeddedAssetBytes = options.maxTotalEmbeddedAssetBytes ?? defaultMaxTotalEmbeddedAssetBytes;

  for (const asset of assets) {
    const file = await createAssetFileEntry(asset, {
      fileSystem: options.fileSystem ?? defaultFileSystem,
      maxEmbeddedAssetBytes: options.maxEmbeddedAssetBytes ?? defaultMaxEmbeddedAssetBytes,
      remainingEmbeddedAssetBytes: Math.max(0, maxTotalEmbeddedAssetBytes - totalEmbeddedAssetBytes),
      userDataPath: options.userDataPath
    });

    if (file.kind === "embedded") {
      totalEmbeddedAssetBytes += file.byteSize;
    }

    packageAssets.push({
      ...asset,
      file
    });
  }

  return packageAssets;
};

const createAssetFileEntry = async (
  asset: MediaAssetRecord,
  options: { fileSystem: PackageAssetFileSystem; maxEmbeddedAssetBytes: number; remainingEmbeddedAssetBytes: number; userDataPath?: string }
): Promise<PackageAssetFile> => {
  const sourcePathExists = await pathExists(asset.sourcePath, options.fileSystem);
  const managedPath = options.userDataPath ? resolveManagedAssetPath(options.userDataPath, asset.managedRelPath) : undefined;
  const managedPathStatus: PackageAssetStatResult = managedPath
    ? await statFile(managedPath, options.fileSystem)
    : { exists: false };
  const managedPathExists = managedPathStatus.exists;
  const baseEntry = {
    managedRelPath: asset.managedRelPath,
    managedPath,
    managedPathExists,
    sourcePath: asset.sourcePath,
    sourcePathExists,
    byteSize: asset.byteSize
  };

  if (!managedPath) {
    return {
      ...baseEntry,
      kind: "local-reference",
      reason: "No userData path was available while creating the package."
    };
  }

  if (!managedPathStatus.exists) {
    if (managedPathStatus.error) {
      return {
        ...baseEntry,
        kind: "local-reference",
        reason: `Managed asset file could not be accessed at package export time: ${formatFileError(managedPathStatus.error)}.`
      };
    }

    return {
      ...baseEntry,
      kind: "local-reference",
      reason: "Managed asset file was not found at package export time."
    };
  }

  const fileStat = managedPathStatus.stat;
  if (fileStat.size > options.maxEmbeddedAssetBytes) {
    return {
      ...baseEntry,
      kind: "local-reference",
      byteSize: fileStat.size,
      reason: "Managed asset file is larger than the package embed limit."
    };
  }

  if (fileStat.size > options.remainingEmbeddedAssetBytes) {
    return {
      ...baseEntry,
      kind: "local-reference",
      byteSize: fileStat.size,
      reason: "Managed asset file would exceed the package total embed limit."
    };
  }

  let contentBase64: string;
  try {
    contentBase64 = (await options.fileSystem.readFile(managedPath)).toString("base64");
  } catch (caught) {
    return {
      ...baseEntry,
      kind: "local-reference",
      byteSize: fileStat.size,
      reason: `Managed asset file could not be read at package export time: ${formatFileError(caught)}.`
    };
  }

  return {
    ...baseEntry,
    kind: "embedded",
    byteSize: fileStat.size,
    encoding: "base64",
    contentBase64
  };
};

const resolveManagedAssetPath = (userDataPath: string, managedRelPath: string) => {
  const root = resolve(userDataPath);
  const candidate = resolve(root, managedRelPath);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
    return undefined;
  }

  return candidate;
};

const pathExists = async (filePath: string, fileSystem: PackageAssetFileSystem) => {
  const status = await statFile(filePath, fileSystem);
  return status.exists;
};

const statFile = async (filePath: string, fileSystem: PackageAssetFileSystem): Promise<PackageAssetStatResult> => {
  try {
    return {
      exists: true,
      stat: await fileSystem.stat(filePath)
    };
  } catch (caught) {
    if ((caught as NodeJS.ErrnoException).code === "ENOENT") {
      return { exists: false };
    }
    return {
      exists: false,
      error: caught
    };
  }
};

const formatFileError = (caught: unknown) => {
  const error = caught as NodeJS.ErrnoException;
  return error.code ?? error.message ?? "unknown error";
};
