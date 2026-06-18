import type { TierStudioApi } from "../../shared/contracts/tierStudioApi";
import type { EditorStore } from "../domain/editorTypes";
import { sortRecentLists } from "../domain/editorMappers";

const defaultRows = [
  { label: "S", color: "#ef4444" },
  { label: "A", color: "#f97316" },
  { label: "B", color: "#eab308" },
  { label: "C", color: "#22c55e" },
  { label: "D", color: "#3b82f6" }
];

export const activeListStorageKey = "tier-list-studio-active-list-id";
export const activeListSessionKey = "tier-list-studio-editor-session";

export const createEditorStore = (api: TierStudioApi): EditorStore => ({
  loadDashboard: async () => {
    const workspaces = await api.workspaces.list();
    const listsByWorkspace = await Promise.all(workspaces.map((workspace) => api.lists.list(workspace.id)));

    return {
      workspaces,
      recentLists: sortRecentLists(listsByWorkspace.flat()).slice(0, 8)
    };
  },
  createBoard: async (name: string) => {
    const workspace = await api.workspaces.create({ name: "Tier List Studio" });
    const list = await api.lists.create({ workspaceId: workspace.id, name });

    for (const row of defaultRows) {
      await api.rows.insert(list.id, row);
    }

    return list.id;
  },
  openBoard: async (listId: string) => {
    const list = await api.lists.get(listId);
    if (!list) {
      window.localStorage.removeItem(activeListStorageKey);
      window.sessionStorage.removeItem(activeListSessionKey);
      throw new Error(`Tier list not found: ${listId}`);
    }

    window.localStorage.setItem(activeListStorageKey, list.id);
    window.sessionStorage.setItem(activeListSessionKey, "open");
  }
});
