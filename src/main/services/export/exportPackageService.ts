import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";

import type { TierListDetail } from "../../../shared/models/api.js";
import type { ExportArtifact } from "../../../shared/models/entities.js";
import type { MediaAssetRecord } from "../repositories/types.js";

type ExportPackageOptions = {
  appVersion: string;
  documentsPath: string;
  assetRecords?: MediaAssetRecord[];
  filePath?: string;
  maxEmbeddedAssetBytes?: number;
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

const collectPackageAssets = async (
  list: TierListDetail,
  options: Pick<ExportPackageOptions, "assetRecords" | "maxEmbeddedAssetBytes" | "userDataPath">
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

  return Promise.all(assets.map(async (asset) => ({
    ...asset,
    file: await createAssetFileEntry(asset, {
      maxEmbeddedAssetBytes: options.maxEmbeddedAssetBytes ?? defaultMaxEmbeddedAssetBytes,
      userDataPath: options.userDataPath
    })
  })));
};

const createAssetFileEntry = async (
  asset: MediaAssetRecord,
  options: { maxEmbeddedAssetBytes: number; userDataPath?: string }
): Promise<PackageAssetFile> => {
  const sourcePathExists = await pathExists(asset.sourcePath);
  const managedPath = options.userDataPath ? resolveManagedAssetPath(options.userDataPath, asset.managedRelPath) : undefined;
  const managedPathExists = managedPath ? await pathExists(managedPath) : false;
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

  if (!managedPathExists) {
    return {
      ...baseEntry,
      kind: "local-reference",
      reason: "Managed asset file was not found at package export time."
    };
  }

  const fileStat = await stat(managedPath);
  if (fileStat.size > options.maxEmbeddedAssetBytes) {
    return {
      ...baseEntry,
      kind: "local-reference",
      byteSize: fileStat.size,
      reason: "Managed asset file is larger than the package embed limit."
    };
  }

  return {
    ...baseEntry,
    kind: "embedded",
    byteSize: fileStat.size,
    encoding: "base64",
    contentBase64: (await readFile(managedPath)).toString("base64")
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

const pathExists = async (filePath: string) => {
  try {
    await stat(filePath);
    return true;
  } catch (caught) {
    if ((caught as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw caught;
  }
};
