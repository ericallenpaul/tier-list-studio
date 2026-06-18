import type { DragEvent } from "react";

import { AddItemsModal } from "../components/AddItemsModal";
import { BottomRail } from "../components/BottomRail";
import { ItemDock } from "../components/ItemDock";
import { PresentationSurface } from "../components/PresentationSurface";
import { TierBoard } from "../components/TierBoard";
import type { EditorBoardItem, EditorBoardState, EditorContainer, EditorMode, EditorScreen, EditorTier } from "../domain/editorTypes";

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

type Effects = {
  glow: boolean;
  shake: boolean;
  confetti: boolean;
};

type EditorPageProps = {
  board: EditorBoardState;
  screen: EditorScreen;
  mode: EditorMode;
  templates: Template[];
  themes: Theme[];
  activeThemeIndex: number;
  activeTheme: Theme;
  providers: ProviderState[];
  effects: Effects;
  selectedItemId: string | null;
  selectedItem: EditorBoardItem | null;
  poolItems: EditorBoardItem[];
  onSetScreen: (screen: EditorScreen) => void;
  onSetMode: (mode: EditorMode) => void;
  onExportPresentation: () => void;
  onOpenAddItems: () => void;
  onCloseAddItems: () => void;
  onItemsAdded: () => Promise<void>;
  isAddItemsOpen: boolean;
  onDuplicateBoard: () => void;
  onCreateTemplate: () => void;
  onResetBoard: (template: Template) => void;
  onSetActiveThemeIndex: (index: number) => void;
  onToggleEffect: (key: keyof Effects) => void;
  onToggleProvider: (name: string) => void;
  onSendSelectedToPool: () => void;
  onDragStart: (event: DragEvent<HTMLElement>, itemId: string) => void;
  onDropItem: (event: DragEvent<HTMLElement>, target: EditorContainer) => void;
  onMoveItem: (itemId: string, target: EditorContainer) => void;
  onSelectItem: (itemId: string) => void;
};

export const EditorPage = ({
  board,
  screen,
  mode,
  templates,
  themes,
  activeThemeIndex,
  activeTheme,
  providers,
  effects,
  selectedItemId,
  selectedItem,
  poolItems,
  onSetScreen,
  onSetMode,
  onExportPresentation,
  onOpenAddItems,
  onCloseAddItems,
  onItemsAdded,
  isAddItemsOpen,
  onDuplicateBoard,
  onCreateTemplate,
  onResetBoard,
  onSetActiveThemeIndex,
  onToggleEffect,
  onToggleProvider,
  onSendSelectedToPool,
  onDragStart,
  onDropItem,
  onMoveItem,
  onSelectItem
}: EditorPageProps) => {
  if (mode === "presentation") {
    return (
      <PresentationSurface
        board={board}
        poolItems={poolItems}
        selectedItemId={selectedItemId}
        selectedItem={selectedItem}
        onDragStart={onDragStart}
        onDropItem={onDropItem}
        onMoveItem={onMoveItem}
        onSelectItem={onSelectItem}
      />
    );
  }

  return (
    <section className="editor-page">
      <header className="topbar" data-testid="top-command-bar">
        <div className="topbar-left">
          <div className="brand-inline">
            <span className="brand-mark" />
            <span className="brand-name">Tier List Studio</span>
          </div>
          <button className={`menu-button ${screen === "board" ? "active" : ""}`} onClick={() => onSetScreen("board")}>
            Board
          </button>
          <button className={`menu-button ${screen === "settings" ? "active" : ""}`} onClick={() => onSetScreen("settings")}>
            Settings
          </button>
        </div>

        <div className="mode-switch">
          <button className="active" onClick={() => onSetMode("build")}>
            Build
          </button>
          <button onClick={() => onSetMode("presentation")}>Presentation</button>
        </div>

        <div className="topbar-right">
          <button className="icon-button" aria-label="Undo">
            ↶
          </button>
          <button className="icon-button" aria-label="Redo">
            ↷
          </button>
          <button className="primary" onClick={onExportPresentation}>
            Export
          </button>
          {screen === "board" ? (
            <>
              <button className="primary" onClick={onOpenAddItems} disabled={!board.id}>
                Add Items
              </button>
              <button className="primary" onClick={onDuplicateBoard}>
                Duplicate
              </button>
            </>
          ) : null}
        </div>
      </header>

      {screen === "board" ? (
        <>
          <section className="metadata-strip" data-testid="metadata-strip">
            <div className="title-stack">
              <div className="eyebrow">Board</div>
              <h1>{board.name}</h1>
            </div>
            <div className="board-chips">
              <span className="pill active">{selectedItem ? selectedItem.label : "Ready"}</span>
              <span className="pill">{poolItems.length} pool</span>
              <span className="pill">{board.tiers.length} rows</span>
              {selectedItem ? (
                <button className="pill-button" onClick={onSendSelectedToPool}>
                  Pool
                </button>
              ) : null}
            </div>
          </section>

          <TierBoard
            board={board}
            selectedItemId={selectedItemId}
            selectedItem={selectedItem}
            onDragStart={onDragStart}
            onDropItem={onDropItem}
            onMoveItem={onMoveItem}
            onSelectItem={onSelectItem}
          />
          <ItemDock
            items={poolItems}
            selectedItemId={selectedItemId}
            onDragStart={onDragStart}
            onDropItem={onDropItem}
            onSelectItem={onSelectItem}
          />
          <BottomRail
            templates={templates}
            themes={themes}
            activeThemeIndex={activeThemeIndex}
            activeTheme={activeTheme}
            effects={effects}
            onCreateTemplate={onCreateTemplate}
            onResetBoard={onResetBoard}
            onSetActiveThemeIndex={onSetActiveThemeIndex}
            onToggleEffect={onToggleEffect}
          />
          {isAddItemsOpen && board.id ? (
            <AddItemsModal listId={board.id} onClose={onCloseAddItems} onItemsAdded={onItemsAdded} />
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
                  className="pill-button"
                  onClick={() => {
                    onSetScreen("board");
                    onSetMode("presentation");
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
                  <button
                    className={`switch ${provider.enabled ? "active" : ""}`}
                    onClick={() => onToggleProvider(provider.name)}
                    aria-label={provider.name}
                  />
                </div>
              ))}
            </div>
          </section>
        </section>
      )}
    </section>
  );
};
