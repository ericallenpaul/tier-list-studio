import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { toJpeg, toPng } from "html-to-image";

import { mapTierListToBoard } from "./domain/editorMappers";
import type { EditorBoardItem, EditorBoardState, EditorContainer, EditorMode, EditorScreen, EditorTier } from "./domain/editorTypes";
import type { TierTemplate, UserSettings } from "../shared/models/entities";
import type { ImageExportFormat } from "./components/ExportPanel";
import { PresentationSurface } from "./components/PresentationSurface";
import { DashboardPage } from "./pages/DashboardPage";
import { EditorPage } from "./pages/EditorPage";
import { activeListSessionKey, activeListStorageKey, createEditorStore } from "./state/editorStore";
import { loadPersistedState, type PersistedState } from "./state/persistedState";
import { starterTemplates, type StarterTemplateSeed } from "./templates/starterTemplates";

type Theme = {
  name: string;
  accent: string;
  background: string;
};

const themes: Theme[] = [
  { name: "Midnight", accent: "#22c55e", background: "#0f1218" },
  { name: "Signal", accent: "#38bdf8", background: "#0b1020" },
  { name: "Heat", accent: "#f97316", background: "#150f0b" }
];

const fallbackTemplate = starterTemplates.find((template) => template.id === "template-launch-week") ?? starterTemplates[0];

const makeBoard = (template: StarterTemplateSeed = fallbackTemplate): EditorBoardState => {
  const now = new Date().toISOString();
  const rows = template.definition.rows.map<EditorTier>((row, index) => ({
    id: row.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `row-${index + 1}`,
    label: row.label,
    color: row.fillColor
  }));

  return {
    name: template.name,
    tiers: rows,
    items: (template.definition.items ?? []).map((item, index) => ({
      id: `${template.name.toLowerCase().replace(/\s+/g, "-")}-${index + 1}`,
      label: item.label,
      kind: "text",
      container: item.container === "tier" && item.rowIndex !== null ? rows[item.rowIndex]?.id ?? "pool" : "pool",
      metadata: {},
      style: {},
      createdAt: now,
      updatedAt: now
    })),
    style: template.definition.style
  };
};

const waitForPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

const toExportFileName = (name: string, extension: ImageExportFormat) =>
  `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tier-list"}.${extension}`;

const loadState = (): PersistedState | undefined => loadPersistedState();

const editorStore = createEditorStore(window.tierStudio);

const loadBoard = async (listId: string) => {
  await editorStore.openBoard(listId);
  const list = await window.tierStudio.lists.get(listId);
  if (!list) {
    throw new Error(`Tier list not found: ${listId}`);
  }

  return mapTierListToBoard(list);
};

const moveLocalItemsToPool = (current: EditorBoardState, itemIds: string[]): EditorBoardState => {
  const targetIds = new Set(itemIds);
  const movedItems = itemIds
    .map((itemId) => current.items.find((item) => item.id === itemId))
    .filter((item): item is EditorBoardItem => Boolean(item));
  const remainingItems = current.items.filter((item) => !targetIds.has(item.id));
  const now = new Date().toISOString();

  return {
    ...current,
    items: [
      ...remainingItems.filter((item) => item.container === "pool"),
      ...movedItems.map((item) => ({ ...item, container: "pool" as const, updatedAt: now })),
      ...remainingItems.filter((item) => item.container !== "pool")
    ]
  };
};

export const App = () => {
  const saved = loadState();
  const savedListId = window.localStorage.getItem(activeListStorageKey);
  const startsInEditor = Boolean(savedListId && window.sessionStorage.getItem(activeListSessionKey));
  const [isEditorOpen, setIsEditorOpen] = useState(startsInEditor);
  const [screen, setScreen] = useState<EditorScreen>(saved?.screen ?? "board");
  const [mode, setMode] = useState<EditorMode>(saved?.mode ?? "build");
  const [board, setBoard] = useState<EditorBoardState>(saved?.board ?? makeBoard());
  const [templates, setTemplates] = useState<TierTemplate[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(saved?.selectedItemId ?? null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(saved?.selectedItemIds ?? []);
  const [activeThemeIndex, setActiveThemeIndex] = useState(saved?.activeThemeIndex ?? 0);
  const [effects, setEffects] = useState(saved?.effects ?? { glow: true, shake: false, confetti: false });
  const [isAddItemsOpen, setIsAddItemsOpen] = useState(false);
  const [isExportCaptureMounted, setIsExportCaptureMounted] = useState(false);
  const exportSurfaceRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    localStorage.setItem(
      "tier-list-studio-state",
      JSON.stringify({ screen, mode, board, selectedItemId, selectedItemIds, activeThemeIndex, effects })
    );
  }, [screen, mode, board, selectedItemId, selectedItemIds, activeThemeIndex, effects]);

  const refreshTemplates = async () => {
    setTemplates(await window.tierStudio.templates.list());
  };

  const refreshSettings = async () => {
    setSettings(await window.tierStudio.settings.get());
  };

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

  useEffect(() => {
    void refreshTemplates();
    void refreshSettings();
  }, []);

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

  const createTemplateFromBoard = async (name: string) => {
    if (!board.id) {
      throw new Error("Save the board before creating a template.");
    }

    const created = await window.tierStudio.templates.createFromList(board.id, name);
    setTemplates((current) => [...current.filter((template) => template.id !== created.id), created]);
  };

  const duplicateBoard = () => {
    setBoard(({ id: _id, ...current }) => ({
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

    setBoard((current) => target === "pool"
      ? moveLocalItemsToPool(current, [itemId])
      : {
          ...current,
          items: current.items.map((item) => (item.id === itemId ? { ...item, container: target, updatedAt: new Date().toISOString() } : item))
        });
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

    setBoard((current) => moveLocalItemsToPool(current, itemIds));
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

  const exportImage = async (format: ImageExportFormat) => {
    setIsExportCaptureMounted(true);

    try {
      await waitForPaint();

      const surface = exportSurfaceRef.current;
      if (!surface) {
        throw new Error("Presentation export surface is not available.");
      }

      const imageOptions = {
        backgroundColor: activeTheme.background,
        cacheBust: true,
        pixelRatio: 2
      };
      const dataUrl = format === "png"
        ? await toPng(surface, imageOptions)
        : await toJpeg(surface, { ...imageOptions, quality: 0.92 });

      return window.tierStudio.exports.renderImage({
        listId: board.id ?? board.name,
        fileName: toExportFileName(board.name, format),
        format,
        scale: 2,
        transparentBackground: false,
        imageDataUrl: dataUrl
      });
    } finally {
      setIsExportCaptureMounted(false);
    }
  };

  const exportCsv = async () => {
    if (!board.id) {
      throw new Error("Save the board before CSV export.");
    }

    return window.tierStudio.exports.exportCsv(board.id);
  };

  const exportPackage = async () => {
    if (!board.id) {
      throw new Error("Save the board before package export.");
    }

    return window.tierStudio.exports.exportPackage(board.id);
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

  const resolveTemplateWorkspaceId = async () => {
    if (settings?.defaultWorkspaceId) {
      return settings.defaultWorkspaceId;
    }

    const workspaces = await window.tierStudio.workspaces.list();
    return workspaces[0]?.id ?? (await window.tierStudio.workspaces.create({ name: "Tier List Studio" })).id;
  };

  const useTemplate = async (templateId: string) => {
    const list = await window.tierStudio.templates.instantiate(templateId, await resolveTemplateWorkspaceId());
    await openBoard(list.id);
  };

  const saveSettings = async (openAiApiKey?: string) => {
    setSettings(await window.tierStudio.settings.update({
      ai: {
        preferredProviderId: "openai",
        enabled: openAiApiKey === undefined ? Boolean(settings?.ai.openAiApiKeyConfigured) : Boolean(openAiApiKey.trim()),
        ...(openAiApiKey === undefined ? {} : { openAiApiKey })
      }
    }));
  };

  if (!isEditorOpen) {
    return <DashboardPage store={editorStore} templates={templates} onOpenBoard={openBoard} onUseTemplate={useTemplate} />;
  }

  const poolItems = board.items.filter((item) => item.container === "pool");
  const noopDragStart = () => undefined;
  const noopDropItem = () => undefined;
  const noopMoveItem = () => undefined;
  const noopSelectItem = () => undefined;

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
        settings={settings}
        effects={effects}
        selectedItemId={selectedItemId}
        selectedItemIds={selectedItemIds}
        selectedItem={selectedItem}
        poolItems={poolItems}
        onSetScreen={setScreen}
        onSetMode={setMode}
        onExportImage={exportImage}
        onExportCsv={exportCsv}
        onExportPackage={exportPackage}
        onOpenAddItems={() => setIsAddItemsOpen(true)}
        onCloseAddItems={() => setIsAddItemsOpen(false)}
        onItemsAdded={refreshActiveBoard}
        isAddItemsOpen={isAddItemsOpen}
        onDuplicateBoard={duplicateBoard}
        onCreateTemplate={createTemplateFromBoard}
        onUseTemplate={useTemplate}
        onSaveSettings={saveSettings}
        onSetActiveThemeIndex={setActiveThemeIndex}
        onToggleEffect={toggleEffect}
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
      {mode === "build" && isExportCaptureMounted ? (
        <div className="export-capture-host" aria-hidden="true">
          <PresentationSurface
            ref={exportSurfaceRef}
            board={board}
            poolItems={poolItems}
            selectedItemId={null}
            selectedItem={null}
            onDragStart={noopDragStart}
            onDropItem={noopDropItem}
            onMoveItem={noopMoveItem}
            onSelectItem={noopSelectItem}
            includeTestIds={false}
          />
        </div>
      ) : null}
    </main>
  );
};
