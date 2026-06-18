import type { EditorBoardItem, EditorBoardState, EditorTier, ListWithItems, TierList } from "./editorTypes";

export const defaultEditorTiers: EditorTier[] = [
  { id: "s", label: "S", color: "#ef4444" },
  { id: "a", label: "A", color: "#f97316" },
  { id: "b", label: "B", color: "#eab308" },
  { id: "c", label: "C", color: "#22c55e" },
  { id: "d", label: "D", color: "#3b82f6" }
];

export const mapTierListToBoard = (list: ListWithItems): EditorBoardState => ({
  id: list.id,
  name: list.name,
  tiers: defaultEditorTiers.map((tier) => ({ ...tier })),
  items: (list.items ?? []).map<EditorBoardItem>((item) => ({
    id: item.id,
    label: item.label,
    container: "pool"
  }))
});

export const sortRecentLists = (lists: TierList[]) =>
  [...lists].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
