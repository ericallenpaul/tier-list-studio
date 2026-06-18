import { useEffect, useMemo, useState, type DragEvent } from "react";
import { toPng } from "html-to-image";

import { mapTierListToBoard } from "./domain/editorMappers";
import type { EditorBoardItem, EditorBoardState, EditorContainer, EditorMode, EditorScreen, EditorTier } from "./domain/editorTypes";
import { DashboardPage } from "./pages/DashboardPage";
import { EditorPage } from "./pages/EditorPage";
import { activeListSessionKey, activeListStorageKey, createEditorStore } from "./state/editorStore";

type Template = {
  name: string;
  accent: string;
  tiers: EditorTier[];
  items: string[];
};

type Theme = {
  name: string;
  accent: string;
  background: string;
};

type ProviderState = {
  name: string;
  configured: boolean;
  enabled: boolean;
};

type PersistedState = {
  screen?: EditorScreen;
  mode?: EditorMode;
  selectedItemId?: string | null;
  selectedItemIds?: string[];
  activeThemeIndex?: number;
  board?: EditorBoardState;
  providers?: ProviderState[];
  effects?: { glow: boolean; shake: boolean; confetti: boolean };
};

const initialTemplates: Template[] = [
  {
    name: "Launch Week",
    accent: "#22c55e",
    tiers: [
      { id: "s", label: "S", color: "#ef4444" },
      { id: "a", label: "A", color: "#f97316" },
      { id: "b", label: "B", color: "#eab308" },
      { id: "c", label: "C", color: "#22c55e" },
      { id: "d", label: "D", color: "#3b82f6" }
    ],
    items: ["Ramen", "Coffee", "Camera", "Headphones", "Notebook", "Desk Lamp", "Microphone", "Mouse"]
  },
  {
    name: "Creator Picks",
    accent: "#f97316",
    tiers: [
      { id: "featured", label: "Featured", color: "#38bdf8" },
      { id: "good", label: "Good", color: "#22c55e" },
      { id: "mixed", label: "Mixed", color: "#eab308" },
      { id: "pass", label: "Pass", color: "#ef4444" }
    ],
    items: ["Intro", "B-roll", "Talking Head", "FX", "Music", "Cutaway", "Graphic", "Outro"]
  }
];

const themes: Theme[] = [
  { name: "Midnight", accent: "#22c55e", background: "#0f1218" },
  { name: "Signal", accent: "#38bdf8", background: "#0b1020" },
  { name: "Heat", accent: "#f97316", background: "#150f0b" }
];

const defaultProviders: ProviderState[] = [
  { name: "OpenAI", configured: true, enabled: true },
  { name: "Anthropic", configured: false, enabled: false },
  { name: "Local", configured: false, enabled: false }
];

const makeBoard = (template: Template = initialTemplates[0]): EditorBoardState => {
  const now = new Date().toISOString();
  return {
    name: template.name,
    tiers: template.tiers,
    items: template.items.map((label, index) => ({
      id: `${template.name.toLowerCase().replace(/\s+/g, "-")}-${index + 1}`,
      label,
      kind: "text",
      container: "pool",
      metadata: {},
      style: {},
      createdAt: now,
      updatedAt: now
    }))
  };
};

const waitForPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

const toExportFileName = (name: string) => `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tier-list"}.png`;

const loadState = (): PersistedState | undefined => {
  const raw = localStorage.getItem("tier-list-studio-state");
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as PersistedState;
  } catch {
    return undefined;
  }
};

const editorStore = createEditorStore(window.tierStudio);

const loadBoard = async (listId: string) => {
  await editorStore.openBoard(listId);
  const list = await window.tierStudio.lists.get(listId);
  if (!list) {
    throw new Error(`Tier list not found: ${listId}`);
  }

  return mapTierListToBoard(list);
};

export const App = () => {
  const saved = loadState();
  const savedListId = window.localStorage.getItem(activeListStorageKey);
  const startsInEditor = Boolean(savedListId && window.sessionStorage.getItem(activeListSessionKey));
  const [isEditorOpen, setIsEditorOpen] = useState(startsInEditor);
  const [screen, setScreen] = useState<EditorScreen>(saved?.screen ?? "board");
  const [mode, setMode] = useState<EditorMode>(saved?.mode ?? "build");
  const [board, setBoard] = useState<EditorBoardState>(saved?.board ?? makeBoard());
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(saved?.selectedItemId ?? null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(saved?.selectedItemIds ?? []);
  const [activeThemeIndex, setActiveThemeIndex] = useState(saved?.activeThemeIndex ?? 0);
  const [providers, setProviders] = useState<ProviderState[]>(saved?.providers ?? defaultProviders);
  const [effects, setEffects] = useState(saved?.effects ?? { glow: true, shake: false, confetti: false });
  const [isAddItemsOpen, setIsAddItemsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(
      "tier-list-studio-state",
      JSON.stringify({ screen, mode, board, selectedItemId, selectedItemIds, activeThemeIndex, providers, effects })
    );
  }, [screen, mode, board, selectedItemId, selectedItemIds, activeThemeIndex, providers, effects]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMode("build");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!startsInEditor || !savedListId) {
      return;
    }

    let isMounted = true;
    loadBoard(savedListId)
      .then((loadedBoard) => {
        if (isMounted) {
          setBoard(loadedBoard);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsEditorOpen(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [savedListId, startsInEditor]);

  const activeTheme = themes[activeThemeIndex];
  const selectedItem = useMemo(
    () => board.items.find((item) => item.id === selectedItemId) ?? null,
    [board.items, selectedItemId]
  );

  useEffect(() => {
    const itemIds = new Set(board.items.map((item) => item.id));
    if (selectedItemId && !itemIds.has(selectedItemId)) {
      setSelectedItemId(null);
    }
    setSelectedItemIds((current) => current.filter((itemId) => itemIds.has(itemId)));
  }, [board.items, selectedItemId]);

  const resetBoard = (template: Template = templates[0]) => {
    setBoard(makeBoard(template));
    setSelectedItemId(null);
    setSelectedItemIds([]);
    setScreen("board");
  };

  const createTemplateFromBoard = () => {
    const name = window.prompt("Template name", `${board.name} Template`);
    if (!name?.trim()) {
      return;
    }

    setTemplates((current) => [
      ...current,
      {
        name: name.trim(),
        accent: activeTheme.accent,
        tiers: board.tiers.map((tier) => ({ ...tier })),
        items: board.items.map((item) => item.label)
      }
    ]);
  };

  const duplicateBoard = () => {
    setBoard((current) => ({
      ...current,
      name: `${current.name} Copy`,
      items: current.items.map((item, index) => ({ ...item, id: `${item.id}-copy-${index}` }))
    }));
    setSelectedItemIds([]);
  };

  const moveItem = async (itemId: string, target: EditorContainer) => {
    if (board.id) {
      const targetIndex = board.items.filter((item) => item.container === target && item.id !== itemId).length;
      await editorStore.moveItems(board.id, [itemId], target === "pool" ? null : target, targetIndex);
      await refreshActiveBoard();
      return;
    }

    setBoard((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === itemId ? { ...item, container: target } : item))
    }));
    setSelectedItemId(null);
  };

  const onDragStart = (event: DragEvent<HTMLElement>, itemId: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", itemId);
  };

  const onDropItem = (event: DragEvent<HTMLElement>, target: EditorContainer) => {
    event.preventDefault();
    const itemId = event.dataTransfer.getData("text/plain");
    if (itemId) {
      void moveItem(itemId, target);
    }
  };

  const refreshActiveBoard = async () => {
    if (!board.id) {
      return;
    }

    setBoard(await loadBoard(board.id));
    setSelectedItemId(null);
    setSelectedItemIds([]);
  };

  const toggleProvider = (name: string) => {
    setProviders((current) =>
      current.map((provider) => (provider.name === name ? { ...provider, enabled: !provider.enabled } : provider))
    );
  };

  const toggleEffect = (key: keyof typeof effects) => {
    setEffects((current) => ({ ...current, [key]: !current[key] }));
  };

  const sendSelectedToPool = () => {
    if (!selectedItemId) {
      return;
    }
    void moveItem(selectedItemId, "pool");
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds((current) =>
      current.includes(itemId) ? current.filter((selectedId) => selectedId !== itemId) : [...current, itemId]
    );
  };

  const checkedItems = () =>
    selectedItemIds
      .map((itemId) => board.items.find((item) => item.id === itemId))
      .filter((item): item is EditorBoardItem => Boolean(item));

  const sendCheckedToPool = async () => {
    const itemIds = checkedItems()
      .filter((item) => item.container !== "pool")
      .map((item) => item.id);
    if (itemIds.length === 0) {
      return;
    }

    if (board.id) {
      const targetIndex = board.items.filter((item) => item.container === "pool" && !itemIds.includes(item.id)).length;
      await editorStore.moveItems(board.id, itemIds, null, targetIndex);
      await refreshActiveBoard();
      return;
    }

    setBoard((current) => ({
      ...current,
      items: current.items.map((item) => (itemIds.includes(item.id) ? { ...item, container: "pool" } : item))
    }));
    setSelectedItemIds([]);
    setSelectedItemId(null);
  };

  const duplicateCheckedItems = async () => {
    const items = checkedItems();
    if (items.length === 0) {
      return;
    }
    if (items.some((item) => item.kind !== "text")) {
      throw new Error("Duplicate is available for text items only.");
    }
    const copyLabels = items.map((item) => `${item.label} Copy`);

    if (board.id) {
      await editorStore.duplicateTextItems(board.id, copyLabels);
      await refreshActiveBoard();
      return;
    }

    const now = new Date().toISOString();
    setBoard((current) => ({
      ...current,
      items: [
        ...current.items,
        ...items.map((item, index) => ({
          ...item,
          id: `${item.id}-copy-${Date.now()}-${index}`,
          label: `${item.label} Copy`,
          kind: "text" as const,
          container: "pool" as const,
          createdAt: now,
          updatedAt: now
        }))
      ]
    }));
    setSelectedItemIds([]);
  };

  const deleteCheckedItems = async () => {
    const itemIds = checkedItems().map((item) => item.id);
    if (itemIds.length === 0) {
      return;
    }

    if (board.id) {
      await Promise.all(itemIds.map((itemId) => editorStore.removeItem(itemId)));
      await refreshActiveBoard();
      return;
    }

    setBoard((current) => ({
      ...current,
      items: current.items.filter((item) => !itemIds.includes(item.id))
    }));
    setSelectedItemIds([]);
    setSelectedItemId((current) => current && itemIds.includes(current) ? null : current);
  };

  const updateItem = async (itemId: string, patch: { label: string; metadata: Record<string, unknown> }) => {
    if (board.id) {
      await editorStore.updateItem(itemId, patch);
      setBoard(await loadBoard(board.id));
      return;
    }

    setBoard((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId
          ? { ...item, label: patch.label, metadata: patch.metadata, updatedAt: new Date().toISOString() }
          : item
      )
    }));
  };

  const insertRow = async (afterRowId?: string) => {
    if (board.id) {
      await editorStore.insertRow(board.id, "New", "#64748b", afterRowId);
      await refreshActiveBoard();
      return;
    }

    setBoard((current) => {
      const insertIndex = afterRowId ? current.tiers.findIndex((tier) => tier.id === afterRowId) + 1 : current.tiers.length;
      const nextTier = { id: `row-${Date.now()}`, label: "New", color: "#64748b" };
      return {
        ...current,
        tiers: [
          ...current.tiers.slice(0, insertIndex),
          nextTier,
          ...current.tiers.slice(insertIndex)
        ]
      };
    });
  };

  const updateRow = async (rowId: string, patch: { label: string; color: string }) => {
    if (board.id) {
      await editorStore.updateRow(rowId, patch);
      await refreshActiveBoard();
      return;
    }

    setBoard((current) => ({
      ...current,
      tiers: current.tiers.map((tier) => (tier.id === rowId ? { ...tier, ...patch } : tier))
    }));
  };

  const reorderRows = async (rowIdsInOrder: string[]) => {
    if (board.id) {
      await editorStore.reorderRows(board.id, rowIdsInOrder);
      await refreshActiveBoard();
      return;
    }

    setBoard((current) => ({
      ...current,
      tiers: rowIdsInOrder
        .map((rowId) => current.tiers.find((tier) => tier.id === rowId))
        .filter((tier): tier is EditorTier => Boolean(tier))
    }));
  };

  const removeRow = async (rowId: string) => {
    if (board.tiers.length <= 1) {
      return;
    }

    if (board.id) {
      await editorStore.removeRow(rowId);
      await refreshActiveBoard();
      return;
    }

    setBoard((current) => ({
      ...current,
      tiers: current.tiers.filter((tier) => tier.id !== rowId),
      items: current.items.map((item) => (item.container === rowId ? { ...item, container: "pool" } : item))
    }));
  };

  const exportPresentation = async () => {
    setMode("presentation");
    setScreen("board");
    await waitForPaint();

    const surface = document.querySelector<HTMLElement>(".presentation-export-surface");
    if (!surface) {
      return;
    }

    const dataUrl = await toPng(surface, {
      backgroundColor: activeTheme.background,
      cacheBust: true,
      pixelRatio: 2
    });
    const artifact = await window.tierStudio.exports.renderImage({
      listId: board.name,
      fileName: toExportFileName(board.name),
      format: "png",
      scale: 2,
      transparentBackground: false,
      imageDataUrl: dataUrl
    });

    window.dispatchEvent(new CustomEvent("tier-studio:export-complete", { detail: artifact }));
  };

  const openBoard = async (listId: string) => {
    const loadedBoard = await loadBoard(listId);
    setBoard(loadedBoard);
    setSelectedItemId(null);
    setSelectedItemIds([]);
    setScreen("board");
    setMode("build");
    setIsEditorOpen(true);
  };

  if (!isEditorOpen) {
    return <DashboardPage store={editorStore} onOpenBoard={openBoard} />;
  }

  const poolItems = board.items.filter((item) => item.container === "pool");

  return (
    <main
      className={`app-shell ${mode === "presentation" ? "presentation" : ""} theme-${activeTheme.name.toLowerCase()}`}
      style={{ ["--theme-accent" as string]: activeTheme.accent, ["--theme-bg" as string]: activeTheme.background }}
    >
      <EditorPage
        board={board}
        screen={screen}
        mode={mode}
        templates={templates}
        themes={themes}
        activeThemeIndex={activeThemeIndex}
        activeTheme={activeTheme}
        providers={providers}
        effects={effects}
        selectedItemId={selectedItemId}
        selectedItemIds={selectedItemIds}
        selectedItem={selectedItem}
        poolItems={poolItems}
        onSetScreen={setScreen}
        onSetMode={setMode}
        onExportPresentation={exportPresentation}
        onOpenAddItems={() => setIsAddItemsOpen(true)}
        onCloseAddItems={() => setIsAddItemsOpen(false)}
        onItemsAdded={refreshActiveBoard}
        isAddItemsOpen={isAddItemsOpen}
        onDuplicateBoard={duplicateBoard}
        onCreateTemplate={createTemplateFromBoard}
        onResetBoard={resetBoard}
        onSetActiveThemeIndex={setActiveThemeIndex}
        onToggleEffect={toggleEffect}
        onToggleProvider={toggleProvider}
        onSendSelectedToPool={sendSelectedToPool}
        onSendCheckedToPool={sendCheckedToPool}
        onDuplicateCheckedItems={duplicateCheckedItems}
        onDeleteCheckedItems={deleteCheckedItems}
        onToggleItemSelection={toggleItemSelection}
        onDragStart={onDragStart}
        onDropItem={onDropItem}
        onMoveItem={moveItem}
        onSelectItem={setSelectedItemId}
        onUpdateItem={updateItem}
        onInsertRow={insertRow}
        onUpdateRow={updateRow}
        onReorderRows={reorderRows}
        onRemoveRow={removeRow}
      />
    </main>
  );
};
