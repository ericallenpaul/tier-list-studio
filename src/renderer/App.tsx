import { useEffect, useMemo, useState, type DragEvent } from "react";
import { toPng } from "html-to-image";

import { mapTierListToBoard } from "./domain/editorMappers";
import type { EditorBoardState, EditorContainer, EditorMode, EditorScreen, EditorTier } from "./domain/editorTypes";
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

const makeBoard = (template: Template = initialTemplates[0]): EditorBoardState => ({
  name: template.name,
  tiers: template.tiers,
  items: template.items.map((label, index) => ({
    id: `${template.name.toLowerCase().replace(/\s+/g, "-")}-${index + 1}`,
    label,
    container: "pool"
  }))
});

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

const loadBoard = async (listId: string, savedBoard?: EditorBoardState) => {
  await editorStore.openBoard(listId);
  const list = await window.tierStudio.lists.get(listId);
  if (!list) {
    throw new Error(`Tier list not found: ${listId}`);
  }

  if (savedBoard?.id === list.id) {
    return {
      ...savedBoard,
      id: list.id,
      name: list.name
    };
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
  const [activeThemeIndex, setActiveThemeIndex] = useState(saved?.activeThemeIndex ?? 0);
  const [providers, setProviders] = useState<ProviderState[]>(saved?.providers ?? defaultProviders);
  const [effects, setEffects] = useState(saved?.effects ?? { glow: true, shake: false, confetti: false });
  const [isAddItemsOpen, setIsAddItemsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(
      "tier-list-studio-state",
      JSON.stringify({ screen, mode, board, selectedItemId, activeThemeIndex, providers, effects })
    );
  }, [screen, mode, board, selectedItemId, activeThemeIndex, providers, effects]);

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
    loadBoard(savedListId, saved?.board)
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

  const resetBoard = (template: Template = templates[0]) => {
    setBoard(makeBoard(template));
    setSelectedItemId(null);
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
  };

  const moveItem = (itemId: string, target: EditorContainer) => {
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
      moveItem(itemId, target);
    }
  };

  const refreshActiveBoard = async () => {
    if (!board.id) {
      return;
    }

    setBoard(await loadBoard(board.id));
    setSelectedItemId(null);
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
    moveItem(selectedItemId, "pool");
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
        onDragStart={onDragStart}
        onDropItem={onDropItem}
        onMoveItem={moveItem}
        onSelectItem={setSelectedItemId}
      />
    </main>
  );
};
