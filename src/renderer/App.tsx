import { useEffect, useMemo, useState, type DragEvent } from "react";
import { toPng } from "html-to-image";

import { mapTierListToBoard } from "./domain/editorMappers";
import type { EditorBoardState, EditorContainer, EditorMode, EditorScreen, EditorTier } from "./domain/editorTypes";
import { DashboardPage } from "./pages/DashboardPage";
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

const itemFontSize = (label: string) => {
  if (label.length > 16) {
    return "0.56rem";
  }
  if (label.length > 10) {
    return "0.62rem";
  }
  return "0.68rem";
};

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
    editorStore.openBoard(savedListId)
      .then(() => window.tierStudio.lists.get(savedListId))
      .then((list) => {
        if (isMounted && list) {
          setBoard(mapTierListToBoard(list));
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

  const addPoolItem = () => {
    const label = window.prompt("Item name");
    if (!label?.trim()) {
      return;
    }

    setBoard((current) => ({
      ...current,
      items: [...current.items, { id: crypto.randomUUID(), label: label.trim(), container: "pool" }]
    }));
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
    await editorStore.openBoard(listId);
    const list = await window.tierStudio.lists.get(listId);
    if (!list) {
      return;
    }

    setBoard(mapTierListToBoard(list));
    setSelectedItemId(null);
    setScreen("board");
    setMode("build");
    setIsEditorOpen(true);
  };

  if (!isEditorOpen) {
    return <DashboardPage store={editorStore} onOpenBoard={openBoard} />;
  }

  const poolItems = board.items.filter((item) => item.container === "pool");
  const visibleScreen = mode === "presentation" ? "board" : screen;

  return (
    <main
      className={`app-shell ${mode === "presentation" ? "presentation" : ""} theme-${activeTheme.name.toLowerCase()}`}
      style={{ ["--theme-accent" as string]: activeTheme.accent, ["--theme-bg" as string]: activeTheme.background }}
    >
      {mode === "build" ? <header className="topbar">
        <div className="topbar-left">
          <div className="brand-inline">
            <span className="brand-mark" />
            <span className="brand-name">Tier List Studio</span>
          </div>
          <button className={`menu-button ${screen === "board" ? "active" : ""}`} onClick={() => setScreen("board")}>Board</button>
          <button className={`menu-button ${screen === "settings" ? "active" : ""}`} onClick={() => setScreen("settings")}>Settings</button>
        </div>

        <div className="mode-switch">
          <button className="active" onClick={() => setMode("build")}>Build</button>
          <button onClick={() => setMode("presentation")}>Presentation</button>
        </div>

        <div className="topbar-right">
          <button className="icon-button" aria-label="Undo">↶</button>
          <button className="icon-button" aria-label="Redo">↷</button>
          <button className="primary" onClick={exportPresentation}>Export</button>
          {screen === "board" ? (
            <>
              <button className="icon-button" aria-label="New item" onClick={addPoolItem}>+</button>
              <button className="primary" onClick={duplicateBoard}>Duplicate</button>
            </>
          ) : null}
        </div>
      </header> : null}

      {visibleScreen === "board" ? (
        <>
          {mode === "build" ? (
            <aside className="sidebar">
              <section className="panel">
                <div className="panel-head">
                  <span className="panel-title">Templates</span>
                  <button className="icon-button" aria-label="New template" onClick={createTemplateFromBoard}>+</button>
                </div>
                <div className="template-list">
                  {templates.map((template) => (
                      <button
                        key={template.name}
                        className="template-card"
                        style={{ ["--accent" as string]: template.accent }}
                      onClick={() => resetBoard(template)}
                    >
                      <span className="template-name">{template.name}</span>
                      <span className="template-bar" />
                    </button>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="panel-head">
                  <span className="panel-title">Theme</span>
                  <span className="panel-chip">{activeTheme.name}</span>
                </div>
                <div className="swatch-row">
                  {themes.map((theme, index) => (
                    <button
                      key={theme.name}
                      className={`swatch ${index === activeThemeIndex ? "active" : ""}`}
                      style={{ backgroundColor: theme.accent }}
                      aria-label={theme.name}
                      onClick={() => setActiveThemeIndex(index)}
                    />
                  ))}
                </div>
              </section>
            </aside>
          ) : null}

          <section className="workspace presentation-export-surface">
            <section className="board-stage">
              {mode === "build" ? <div className="board-head">
                <div className="title-stack">
                  <div className="eyebrow">Board</div>
                  <h1>{board.name}</h1>
                </div>
                <div className="board-chips">
                  <span className="pill active">{selectedItem ? selectedItem.label : "Ready"}</span>
                  <span className="pill">{poolItems.length} pool</span>
                  <span className="pill">{board.tiers.length} rows</span>
                  {selectedItem ? <button className="pill-button" onClick={sendSelectedToPool}>Pool</button> : null}
                </div>
              </div> : null}

              <div className="board">
                {board.tiers.map((tier) => {
                  const tierItems = board.items.filter((item) => item.container === tier.id);
                  return (
                    <div
                      key={tier.id}
                      className={`tier-row ${selectedItem ? "targetable" : ""}`}
                      tabIndex={0}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => onDropItem(event, tier.id)}
                      onClick={() => selectedItem && moveItem(selectedItem.id, tier.id)}
                      onKeyDown={(event) => {
                        if (selectedItem && (event.key === "Enter" || event.key === " ")) {
                          event.preventDefault();
                          moveItem(selectedItem.id, tier.id);
                        }
                      }}
                    >
                      <div className="tier-label" style={{ backgroundColor: tier.color }}>
                        {tier.label}
                      </div>
                      <div className="tier-items">
                        {tierItems.map((item) => (
                          <button
                            key={item.id}
                            className={`item-chip placed ${selectedItemId === item.id ? "selected" : ""}`}
                            style={{ fontSize: itemFontSize(item.label) }}
                            draggable
                            onDragStart={(event) => onDragStart(event, item.id)}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedItemId(item.id);
                            }}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="panel pool-strip" onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDropItem(event, "pool")}>
              {mode === "build" ? <div className="panel-head">
                <span className="panel-title">Pool</span>
                <span className="panel-chip">{poolItems.length}</span>
              </div> : null}
              <div className="pool-grid">
                {poolItems.map((item) => (
                  <button
                    key={item.id}
                    className={`item-chip ${selectedItemId === item.id ? "selected" : ""}`}
                    style={{ fontSize: itemFontSize(item.label) }}
                    draggable
                    onDragStart={(event) => onDragStart(event, item.id)}
                    onClick={() => setSelectedItemId(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
          </section>

          {mode === "build" ? (
            <aside className="inspector">
              <section className="panel">
                <div className="panel-head">
                  <span className="panel-title">Effects</span>
                  <span className="panel-chip">Active</span>
                </div>
                <div className="toggle-grid">
                  <div className="toggle-row">
                    <span>Glow</span>
                    <button className={`switch ${effects.glow ? "active" : ""}`} onClick={() => toggleEffect("glow")} aria-label="Glow" />
                  </div>
                  <div className="toggle-row">
                    <span>Shake</span>
                    <button className={`switch ${effects.shake ? "active" : ""}`} onClick={() => toggleEffect("shake")} aria-label="Shake" />
                  </div>
                  <div className="toggle-row">
                    <span>Confetti</span>
                    <button className={`switch ${effects.confetti ? "active" : ""}`} onClick={() => toggleEffect("confetti")} aria-label="Confetti" />
                  </div>
                </div>
              </section>
            </aside>
          ) : null}
        </>
      ) : (
        <section className="settings-page">
          <section className="panel">
            <div className="panel-head">
              <span className="panel-title">General</span>
              <span className="panel-chip">Settings</span>
            </div>
            <div className="settings-grid">
              <div className="setting-row">
                <span>Default board</span>
                <button className="pill-button">Launch Week</button>
              </div>
              <div className="setting-row">
                <span>Theme</span>
                <button className="pill-button">{activeTheme.name}</button>
              </div>
              <div className="setting-row">
                <span>Presentation</span>
                <button
                  className={`pill-button ${mode === "presentation" ? "active" : ""}`}
                  onClick={() => {
                    setScreen("board");
                    setMode("presentation");
                  }}
                >
                  Enabled
                </button>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <span className="panel-title">AI</span>
              <span className="panel-chip">Settings</span>
            </div>
            <div className="provider-list">
              {providers.map((provider) => (
                <div className="provider-card" key={provider.name}>
                  <div>
                    <div className="provider-name">{provider.name}</div>
                    <div className="provider-state">{provider.configured ? "Configured" : "Disabled"}</div>
                  </div>
                  <button className={`switch ${provider.enabled ? "active" : ""}`} onClick={() => toggleProvider(provider.name)} aria-label={provider.name} />
                </div>
              ))}
            </div>
          </section>
        </section>
      )}
    </main>
  );
};
