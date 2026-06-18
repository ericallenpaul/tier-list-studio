import type { DragEvent } from "react";

import { AddItemsModal } from "../components/AddItemsModal";
import { BottomRail } from "../components/BottomRail";
import { ItemDock } from "../components/ItemDock";
import { ItemInspector } from "../components/ItemInspector";
import { PresentationSurface } from "../components/PresentationSurface";
import { TierBoard } from "../components/TierBoard";
import type { TierTemplate, UserSettings } from "../../shared/models/entities";
import { SettingsPage } from "./SettingsPage";
import type { EditorBoardItem, EditorBoardState, EditorContainer, EditorMode, EditorScreen } from "../domain/editorTypes";

type Theme = {
  name: string;
  accent: string;
  background: string;
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
  templates: TierTemplate[];
  themes: Theme[];
  activeThemeIndex: number;
  activeTheme: Theme;
  settings: UserSettings | null;
  effects: Effects;
  selectedItemId: string | null;
  selectedItemIds: string[];
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
  onCreateTemplate: (name: string) => Promise<void>;
  onUseTemplate: (templateId: string) => Promise<void>;
  onSaveSettings: (openAiApiKey?: string) => Promise<void>;
  onSetActiveThemeIndex: (index: number) => void;
  onToggleEffect: (key: keyof Effects) => void;
  onSendSelectedToPool: () => void;
  onSendCheckedToPool: () => Promise<void> | void;
  onDuplicateCheckedItems: () => Promise<void> | void;
  onDeleteCheckedItems: () => Promise<void> | void;
  onToggleItemSelection: (itemId: string) => void;
  onDragStart: (event: DragEvent<HTMLElement>, itemId: string) => void;
  onDropItem: (event: DragEvent<HTMLElement>, target: EditorContainer) => void;
  onMoveItem: (itemId: string, target: EditorContainer) => Promise<void> | void;
  onSelectItem: (itemId: string) => void;
  onUpdateItem: (itemId: string, patch: { label: string; metadata: Record<string, unknown> }) => Promise<void> | void;
  onInsertRow: (afterRowId?: string) => Promise<void> | void;
  onUpdateRow: (rowId: string, patch: { label: string; color: string }) => Promise<void> | void;
  onReorderRows: (rowIdsInOrder: string[]) => Promise<void> | void;
  onRemoveRow: (rowId: string) => Promise<void> | void;
};

export const EditorPage = ({
  board,
  screen,
  mode,
  templates,
  themes,
  activeThemeIndex,
  activeTheme,
  settings,
  effects,
  selectedItemId,
  selectedItemIds,
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
  onUseTemplate,
  onSaveSettings,
  onSetActiveThemeIndex,
  onToggleEffect,
  onSendSelectedToPool,
  onSendCheckedToPool,
  onDuplicateCheckedItems,
  onDeleteCheckedItems,
  onToggleItemSelection,
  onDragStart,
  onDropItem,
  onMoveItem,
  onSelectItem,
  onUpdateItem,
  onInsertRow,
  onUpdateRow,
  onReorderRows,
  onRemoveRow
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
            canEditRows
            onDragStart={onDragStart}
            onDropItem={onDropItem}
            onMoveItem={onMoveItem}
            onSelectItem={onSelectItem}
            onInsertRow={onInsertRow}
            onUpdateRow={onUpdateRow}
            onReorderRows={onReorderRows}
            onRemoveRow={onRemoveRow}
          />
          <aside className="right-rail">
            <ItemDock
              items={board.items}
              selectedItemId={selectedItemId}
              selectedItemIds={selectedItemIds}
              getContainerLabel={(container) => container === "pool" ? "Pool" : board.tiers.find((tier) => tier.id === container)?.label ?? "Placed"}
              onDragStart={onDragStart}
              onDropItem={onDropItem}
              onSelectItem={onSelectItem}
              onToggleItemSelection={onToggleItemSelection}
              onSendSelectedToPool={onSendCheckedToPool}
              onDuplicateSelected={onDuplicateCheckedItems}
              onDeleteSelected={onDeleteCheckedItems}
            />
            <ItemInspector item={selectedItem} onSave={onUpdateItem} />
          </aside>
          <BottomRail
            templates={templates}
            themes={themes}
            activeThemeIndex={activeThemeIndex}
            activeTheme={activeTheme}
            effects={effects}
            onCreateTemplate={onCreateTemplate}
            onUseTemplate={onUseTemplate}
            canSaveTemplate={Boolean(board.id)}
            onSetActiveThemeIndex={onSetActiveThemeIndex}
            onToggleEffect={onToggleEffect}
          />
          {isAddItemsOpen && board.id ? (
            <AddItemsModal listId={board.id} onClose={onCloseAddItems} onItemsAdded={onItemsAdded} />
          ) : null}
        </>
      ) : (
        <SettingsPage
          activeTheme={activeTheme}
          settings={settings}
          onSaveSettings={onSaveSettings}
          onOpenPresentation={() => {
            onSetScreen("board");
            onSetMode("presentation");
          }}
        />
      )}
    </section>
  );
};
