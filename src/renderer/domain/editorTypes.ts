import type { TierItem, TierList, TierPosition, TierRow, Workspace } from "../../shared/models/entities";

export type { TierList, Workspace };

export type EditorScreen = "board" | "settings";
export type EditorMode = "build" | "presentation";
export type EditorContainer = "pool" | string;

export type EditorTier = {
  id: string;
  label: string;
  color: string;
};

export type EditorBoardItem = {
  id: string;
  label: string;
  container: EditorContainer;
};

export type EditorBoardState = {
  id?: string;
  name: string;
  tiers: EditorTier[];
  items: EditorBoardItem[];
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
};

export type ListWithItems = TierList & {
  items?: TierItem[];
  rows?: TierRow[];
  positions?: TierPosition[];
};
