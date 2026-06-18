import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { TierListDetail } from "../../../shared/models/api.js";
import type { ExportArtifact } from "../../../shared/models/entities.js";

type ExportPackageOptions = {
  appVersion: string;
  documentsPath: string;
  filePath?: string;
};

export const exportPackageArtifact = async (
  list: TierListDetail,
  options: ExportPackageOptions
): Promise<ExportArtifact> => {
  const filePath = options.filePath ?? join(options.documentsPath, "Tier List Studio", "Exports", `${safeFileBase(list.name)}.json`);
  const createdAt = new Date().toISOString();
  const packageData = createPackagePayload(list, {
    appVersion: options.appVersion,
    exportedAt: createdAt
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
  metadata: { appVersion: string; exportedAt: string }
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
  )
});

const safeFileBase = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tier-list";
