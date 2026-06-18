import type { DragEvent, KeyboardEvent } from "react";

import type { EditorBoardState, EditorContainer, EditorBoardItem } from "../domain/editorTypes";

type TierBoardProps = {
  board: EditorBoardState;
  selectedItemId: string | null;
  selectedItem: EditorBoardItem | null;
  onDragStart: (event: DragEvent<HTMLElement>, itemId: string) => void;
  onDropItem: (event: DragEvent<HTMLElement>, target: EditorContainer) => void;
  onMoveItem: (itemId: string, target: EditorContainer) => void;
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

export const TierBoard = ({
  board,
  selectedItemId,
  selectedItem,
  onDragStart,
  onDropItem,
  onMoveItem,
  onSelectItem
}: TierBoardProps) => (
  <section className="board-stage" data-testid="tier-board">
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
            onClick={() => selectedItem && onMoveItem(selectedItem.id, tier.id)}
            onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
              if (selectedItem && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                onMoveItem(selectedItem.id, tier.id);
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
                    onSelectItem(item.id);
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
);
