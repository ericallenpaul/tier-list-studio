import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { ExportArtifact } from "../../../shared/models/entities.js";
import type { TierListDetail } from "../../../shared/models/api.js";

type ExportCsvOptions = {
  documentsPath: string;
  filePath?: string;
};

const csvHeaders = [
  "list_id",
  "list_name",
  "row_id",
  "row_label",
  "row_order",
  "container",
  "item_id",
  "item_label",
  "item_kind",
  "item_order",
  "metadata_json"
];

export const exportCsvArtifact = async (list: TierListDetail, options: ExportCsvOptions): Promise<ExportArtifact> => {
  const filePath = options.filePath ?? join(options.documentsPath, "Tier List Studio", "Exports", `${safeFileBase(list.name)}.csv`);
  const createdAt = new Date().toISOString();

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, serializeListCsv(list), "utf8");

  return {
    filePath,
    format: "csv",
    createdAt
  };
};

export const serializeListCsv = (list: TierListDetail) => {
  const positionsByItemId = new Map((list.positions ?? []).map((position) => [position.itemId, position]));
  const rowsById = new Map((list.rows ?? []).map((row) => [row.id, row]));
  const rows = [csvHeaders];

  const sortedItems = [...(list.items ?? [])].sort((left, right) => {
    const leftPosition = positionsByItemId.get(left.id);
    const rightPosition = positionsByItemId.get(right.id);
    const leftRow = leftPosition?.rowId ? rowsById.get(leftPosition.rowId) : undefined;
    const rightRow = rightPosition?.rowId ? rowsById.get(rightPosition.rowId) : undefined;

    return (leftRow?.sortOrder ?? Number.MAX_SAFE_INTEGER) - (rightRow?.sortOrder ?? Number.MAX_SAFE_INTEGER)
      || (leftPosition?.sortOrder ?? Number.MAX_SAFE_INTEGER) - (rightPosition?.sortOrder ?? Number.MAX_SAFE_INTEGER)
      || left.label.localeCompare(right.label)
      || left.id.localeCompare(right.id);
  });

  for (const item of sortedItems) {
    const position = positionsByItemId.get(item.id);
    const row = position?.rowId ? rowsById.get(position.rowId) : undefined;
    rows.push([
      list.id,
      list.name,
      row?.id ?? "",
      row?.label ?? "",
      row ? String(row.sortOrder) : "",
      row ? "tier" : "pool",
      item.id,
      item.label,
      item.kind,
      position ? String(position.sortOrder) : "",
      JSON.stringify(item.metadata)
    ]);
  }

  return `${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n")}\n`;
};

const escapeCsvCell = (value: string) => {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }

  return value;
};

const safeFileBase = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tier-list";
