import type { EditorBoardItem, EditorBoardState, EditorTier, ListWithItems, TierList } from "./editorTypes";

export const defaultEditorTiers: EditorTier[] = [
  { id: "s", label: "S", color: "#ef4444" },
  { id: "a", label: "A", color: "#f97316" },
  { id: "b", label: "B", color: "#eab308" },
  { id: "c", label: "C", color: "#22c55e" },
  { id: "d", label: "D", color: "#3b82f6" }
];

export const mapTierListToBoard = (list: ListWithItems): EditorBoardState => {
  const positionsByItemId = new Map((list.positions ?? []).map((position) => [position.itemId, position]));
  const tiers = list.rows?.length
    ? [...list.rows]
        .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id))
        .map<EditorTier>((row) => ({
          id: row.id,
          label: row.label,
          color: row.color
        }))
    : defaultEditorTiers.map((tier) => ({ ...tier }));

  const items = [...(list.items ?? [])]
    .sort((left, right) => {
      const leftPosition = positionsByItemId.get(left.id);
      const rightPosition = positionsByItemId.get(right.id);
      const leftContainer = leftPosition?.rowId ?? "pool";
      const rightContainer = rightPosition?.rowId ?? "pool";

      return leftContainer.localeCompare(rightContainer)
        || (leftPosition?.sortOrder ?? Number.MAX_SAFE_INTEGER) - (rightPosition?.sortOrder ?? Number.MAX_SAFE_INTEGER)
        || left.createdAt.localeCompare(right.createdAt)
        || left.id.localeCompare(right.id);
    })
    .map<EditorBoardItem>((item) => {
      const position = positionsByItemId.get(item.id);
      return {
        id: item.id,
        label: item.label,
        kind: item.kind,
        container: position?.rowId ?? "pool",
        metadata: item.metadata,
        style: item.style,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      };
    });

  return {
    id: list.id,
    name: list.name,
    tiers,
    items
  };
};

export const sortRecentLists = (lists: TierList[]) =>
  [...lists].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
