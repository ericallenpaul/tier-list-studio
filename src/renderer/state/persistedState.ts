import type { EditorBoardItem, EditorBoardState, EditorMode, EditorScreen, EditorTier } from "../domain/editorTypes";
import type { TierItemKind } from "../../shared/models/entities";

export type PersistedState = {
  screen?: EditorScreen;
  mode?: EditorMode;
  selectedItemId?: string | null;
  selectedItemIds?: string[];
  activeThemeIndex?: number;
  board?: EditorBoardState;
  effects?: { glow: boolean; shake: boolean; confetti: boolean };
};

const itemKinds = new Set<TierItemKind>(["text", "image", "video", "audio", "file"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeDate = (value: unknown, fallback: string) =>
  typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : fallback;

const normalizeTier = (tier: unknown, index: number): EditorTier => {
  const record = isRecord(tier) ? tier : {};
  return {
    id: typeof record.id === "string" && record.id.trim() ? record.id : `tier-${index + 1}`,
    label: typeof record.label === "string" && record.label.trim() ? record.label : `Tier ${index + 1}`,
    color: typeof record.color === "string" && record.color.trim() ? record.color : "#64748b"
  };
};

const normalizeItem = (item: unknown, index: number, fallbackDate: string): EditorBoardItem => {
  const record = isRecord(item) ? item : {};
  const createdAt = normalizeDate(record.createdAt, fallbackDate);

  return {
    id: typeof record.id === "string" && record.id.trim() ? record.id : `legacy-item-${index + 1}`,
    label: typeof record.label === "string" ? record.label : `Item ${index + 1}`,
    kind: typeof record.kind === "string" && itemKinds.has(record.kind as TierItemKind) ? record.kind as TierItemKind : "text",
    container: typeof record.container === "string" && record.container.trim() ? record.container : "pool",
    metadata: isRecord(record.metadata) ? record.metadata : {},
    style: isRecord(record.style) ? record.style : {},
    createdAt,
    updatedAt: normalizeDate(record.updatedAt, createdAt)
  };
};

export const normalizeEditorBoard = (board: unknown, fallbackDate = new Date().toISOString()): EditorBoardState | undefined => {
  if (!isRecord(board)) {
    return undefined;
  }

  return {
    ...(typeof board.id === "string" && board.id.trim() ? { id: board.id } : {}),
    name: typeof board.name === "string" && board.name.trim() ? board.name : "Untitled Board",
    tiers: Array.isArray(board.tiers) ? board.tiers.map((tier, index) => normalizeTier(tier, index)) : [],
    items: Array.isArray(board.items) ? board.items.map((item, index) => normalizeItem(item, index, fallbackDate)) : []
  };
};

export const normalizePersistedState = (state: unknown, fallbackDate = new Date().toISOString()): PersistedState | undefined => {
  if (!isRecord(state)) {
    return undefined;
  }

  return {
    ...state,
    board: normalizeEditorBoard(state.board, fallbackDate)
  } as PersistedState;
};

export const loadPersistedState = (): PersistedState | undefined => {
  const raw = localStorage.getItem("tier-list-studio-state");
  if (!raw) {
    return undefined;
  }

  try {
    return normalizePersistedState(JSON.parse(raw));
  } catch {
    return undefined;
  }
};
