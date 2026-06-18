import { useMemo, useState, type DragEvent } from "react";

import type { EditorBoardItem, EditorContainer } from "../domain/editorTypes";

type ItemDockProps = {
  items: EditorBoardItem[];
  selectedItemId: string | null;
  selectedItemIds?: string[];
  showHeader?: boolean;
  showControls?: boolean;
  getContainerLabel?: (container: EditorContainer) => string;
  onDragStart: (event: DragEvent<HTMLElement>, itemId: string) => void;
  onDropItem: (event: DragEvent<HTMLElement>, target: EditorContainer) => void;
  onSelectItem: (itemId: string) => void;
  onToggleItemSelection?: (itemId: string) => void;
  onSendSelectedToPool?: () => Promise<void> | void;
  onDuplicateSelected?: () => Promise<void> | void;
  onDeleteSelected?: () => Promise<void> | void;
};

type SortMode = "label" | "date" | "kind";

const itemFontSize = (label: string) => {
  if (label.length > 16) {
    return "0.56rem";
  }
  if (label.length > 10) {
    return "0.62rem";
  }
  return "0.68rem";
};

const defaultContainerLabel = (container: EditorContainer) => container === "pool" ? "Pool" : "Placed";

export const ItemDock = ({
  items,
  selectedItemId,
  selectedItemIds = [],
  showHeader = true,
  showControls = true,
  getContainerLabel = defaultContainerLabel,
  onDragStart,
  onDropItem,
  onSelectItem,
  onToggleItemSelection,
  onSendSelectedToPool,
  onDuplicateSelected,
  onDeleteSelected
}: ItemDockProps) => {
  const [filter, setFilter] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("label");
  const selectedIds = useMemo(() => new Set(selectedItemIds), [selectedItemIds]);
  const filteredItems = useMemo(() => {
    const cleanFilter = filter.trim().toLowerCase();
    return [...items]
      .filter((item) => item.label.toLowerCase().includes(cleanFilter))
      .sort((left, right) => {
        if (sortMode === "date") {
          return right.createdAt.localeCompare(left.createdAt) || left.label.localeCompare(right.label);
        }
        if (sortMode === "kind") {
          return left.kind.localeCompare(right.kind) || left.label.localeCompare(right.label);
        }
        return left.label.localeCompare(right.label);
      });
  }, [filter, items, sortMode]);
  const selectedCount = selectedItemIds.length;

  return (
    <section
      className="panel pool-strip"
      data-testid="item-dock"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDropItem(event, "pool")}
    >
      {showHeader ? (
        <div className="panel-head">
          <span className="panel-title">Items</span>
          <span className="panel-chip">{items.length}</span>
        </div>
      ) : null}

      {showControls ? (
        <div className="dock-tools">
          <label className="dock-filter">
            <span>Filter</span>
            <input
              placeholder="Filter items"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </label>
          <label className="dock-sort">
            <span>Sort</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
              <option value="label">Label</option>
              <option value="date">Date</option>
              <option value="kind">Kind</option>
            </select>
          </label>
          <div className="dock-bulk-actions" aria-label="Bulk item actions">
            <button className="pill-button" type="button" disabled={selectedCount === 0} onClick={() => void onSendSelectedToPool?.()}>
              Send to pool
            </button>
            <button className="pill-button" type="button" disabled={selectedCount === 0} onClick={() => void onDuplicateSelected?.()}>
              Duplicate
            </button>
            <button className="pill-button" type="button" disabled={selectedCount === 0} onClick={() => void onDeleteSelected?.()}>
              Delete
            </button>
          </div>
        </div>
      ) : null}

      <div className={showControls ? "dock-list" : "pool-grid"}>
        {filteredItems.map((item) => (
          <div className={showControls ? "dock-item" : "dock-item compact"} key={item.id}>
            {showControls ? (
              <input
                type="checkbox"
                aria-label={`Select ${item.label}`}
                checked={selectedIds.has(item.id)}
                onChange={() => onToggleItemSelection?.(item.id)}
              />
            ) : null}
            <button
              className={`item-chip ${selectedItemId === item.id ? "selected" : ""}`}
              style={{ fontSize: itemFontSize(item.label) }}
              draggable
              onDragStart={(event) => onDragStart(event, item.id)}
              onClick={() => onSelectItem(item.id)}
            >
              {item.label}
            </button>
            {showControls ? (
              <span className="dock-item-meta">{getContainerLabel(item.container)}</span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
};
