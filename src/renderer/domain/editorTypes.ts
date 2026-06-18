import type { JsonRecord, TierItem, TierItemKind, TierList, TierPosition, TierRow, Workspace } from "../../shared/models/entities";
import type { ItemUpdateInput } from "../../shared/models/api";

export type { TierList, Workspace };

export type EditorScreen = "board" | "settings";
export type EditorMode = "build" | "presentation";
export type EditorContainer = "pool" | string;

export type EditorTier = {
  id: string;
  label: string;
  color: string;
  textColor: string;
};

export type EditorBoardItem = {
  id: string;
  label: string;
  kind: TierItemKind;
  assetId?: string;
  container: EditorContainer;
  metadata: JsonRecord;
  style: JsonRecord;
  createdAt: string;
  updatedAt: string;
};

export type EditorBoardState = {
  id?: string;
  name: string;
  tiers: EditorTier[];
  items: EditorBoardItem[];
  style?: JsonRecord;
};

export type DashboardState = {
  workspaces: Workspace[];
  recentLists: TierList[];
};

export type EditorStore = {
  loadDashboard: () => Promise<DashboardState>;
  createBoard: (name: string) => Promise<string>;
  openBoard: (listId: string) => Promise<void>;
  moveItems: (listId: string, itemIds: string[], targetRowId: string | null, targetIndex: number) => Promise<void>;
  insertRow: (listId: string, label: string, color: string, afterRowId?: string) => Promise<void>;
  updateRow: (rowId: string, patch: { label?: string; color?: string }) => Promise<void>;
  reorderRows: (listId: string, rowIdsInOrder: string[]) => Promise<void>;
  removeRow: (rowId: string) => Promise<void>;
  updateItem: (itemId: string, patch: ItemUpdateInput) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  duplicateTextItems: (listId: string, labels: string[]) => Promise<void>;
};

export type ListWithItems = TierList & {
  items?: TierItem[];
  rows?: TierRow[];
  positions?: TierPosition[];
};
