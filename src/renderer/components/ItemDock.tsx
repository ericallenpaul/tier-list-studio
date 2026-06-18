import type { DragEvent } from "react";

import type { EditorBoardItem, EditorContainer } from "../domain/editorTypes";

type ItemDockProps = {
  items: EditorBoardItem[];
  selectedItemId: string | null;
  showHeader?: boolean;
  onDragStart: (event: DragEvent<HTMLElement>, itemId: string) => void;
  onDropItem: (event: DragEvent<HTMLElement>, target: EditorContainer) => void;
  onSelectItem: (itemId: string) => void;
};

const itemFontSize = (label: string) => {
  if (label.length > 16) {
    return "0.56rem";
  }
  if (label.length > 10) {
    return "0.62rem";
  }
  return "0.68rem";
};

export const ItemDock = ({ items, selectedItemId, showHeader = true, onDragStart, onDropItem, onSelectItem }: ItemDockProps) => (
  <section
    className="panel pool-strip"
    data-testid="item-dock"
    onDragOver={(event) => event.preventDefault()}
    onDrop={(event) => onDropItem(event, "pool")}
  >
    {showHeader ? (
      <div className="panel-head">
        <span className="panel-title">Pool</span>
        <span className="panel-chip">{items.length}</span>
      </div>
    ) : null}
    <div className="pool-grid">
      {items.map((item) => (
        <button
          key={item.id}
          className={`item-chip ${selectedItemId === item.id ? "selected" : ""}`}
          style={{ fontSize: itemFontSize(item.label) }}
          draggable
          onDragStart={(event) => onDragStart(event, item.id)}
          onClick={() => onSelectItem(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  </section>
);
