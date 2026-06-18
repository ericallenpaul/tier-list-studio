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
  const itemsById = new Map((list.items ?? []).map((item) => [item.id, item]));
  const sortedRows = [...(list.rows ?? [])].sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));

  for (const row of sortedRows) {
    const rowPositions = [...(list.positions ?? [])]
      .filter((position) => position.rowId === row.id && itemsById.has(position.itemId))
      .sort((left, right) => left.sortOrder - right.sortOrder || left.itemId.localeCompare(right.itemId));

    if (rowPositions.length === 0) {
      rows.push([
        list.id,
        list.name,
        row.id,
        row.label,
        String(row.sortOrder),
        "tier",
        "",
        "",
        "",
        "",
        ""
      ]);
      continue;
    }

    for (const position of rowPositions) {
      const item = itemsById.get(position.itemId);
      if (!item) {
        continue;
      }
      rows.push(createCsvItemRow(list, row, item, position));
    }
  }

  const poolItems = [...(list.items ?? [])]
    .filter((item) => {
      const position = positionsByItemId.get(item.id);
      return !position?.rowId || !rowsById.has(position.rowId);
    })
    .sort((left, right) => {
      const leftPosition = positionsByItemId.get(left.id);
      const rightPosition = positionsByItemId.get(right.id);

      return (leftPosition?.sortOrder ?? Number.MAX_SAFE_INTEGER) - (rightPosition?.sortOrder ?? Number.MAX_SAFE_INTEGER)
        || left.label.localeCompare(right.label)
        || left.id.localeCompare(right.id);
    });

  for (const item of poolItems) {
    const position = positionsByItemId.get(item.id);
    rows.push([
      list.id,
      list.name,
      "",
      "",
      "",
      "pool",
      item.id,
      item.label,
      item.kind,
      position ? String(position.sortOrder) : "",
      JSON.stringify(item.metadata)
    ]);
  }

  return `${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n")}\n`;
};

const createCsvItemRow = (
  list: TierListDetail,
  row: NonNullable<TierListDetail["rows"]>[number],
  item: NonNullable<TierListDetail["items"]>[number],
  position: NonNullable<TierListDetail["positions"]>[number]
) => [
  list.id,
  list.name,
  row.id,
  row.label,
  String(row.sortOrder),
  "tier",
  item.id,
  item.label,
  item.kind,
  String(position.sortOrder),
  JSON.stringify(item.metadata)
];

const escapeCsvCell = (value: string) => {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }

  return value;
};

const safeFileBase = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tier-list";
