import type { DragEvent } from "react";

import type { EditorBoardState, EditorBoardItem, EditorContainer } from "../domain/editorTypes";
import { ItemDock } from "./ItemDock";
import { TierBoard } from "./TierBoard";

type PresentationSurfaceProps = {
  board: EditorBoardState;
  poolItems: EditorBoardItem[];
  selectedItemId: string | null;
  selectedItem: EditorBoardItem | null;
  onDragStart: (event: DragEvent<HTMLElement>, itemId: string) => void;
  onDropItem: (event: DragEvent<HTMLElement>, target: EditorContainer) => void;
  onMoveItem: (itemId: string, target: EditorContainer) => Promise<void> | void;
  onSelectItem: (itemId: string) => void;
};

export const PresentationSurface = ({
  board,
  poolItems,
  selectedItemId,
  selectedItem,
  onDragStart,
  onDropItem,
  onMoveItem,
  onSelectItem
}: PresentationSurfaceProps) => (
  <section className="workspace presentation-export-surface" data-testid="presentation-surface">
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
      showHeader={false}
      onDragStart={onDragStart}
      onDropItem={onDropItem}
      onSelectItem={onSelectItem}
    />
  </section>
);
