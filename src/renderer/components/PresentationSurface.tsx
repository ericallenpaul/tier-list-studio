import { forwardRef, type DragEvent } from "react";

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
  includeTestIds?: boolean;
};

export const PresentationSurface = forwardRef<HTMLElement, PresentationSurfaceProps>(({
  board,
  poolItems,
  selectedItemId,
  selectedItem,
  onDragStart,
  onDropItem,
  onMoveItem,
  onSelectItem,
  includeTestIds = true
}, ref) => (
  <section ref={ref} className="workspace presentation-export-surface" data-testid={includeTestIds ? "presentation-surface" : undefined}>
    <TierBoard
      board={board}
      selectedItemId={selectedItemId}
      selectedItem={selectedItem}
      onDragStart={onDragStart}
      onDropItem={onDropItem}
      onMoveItem={onMoveItem}
      onSelectItem={onSelectItem}
      testId={includeTestIds ? "tier-board" : null}
    />
    <ItemDock
      items={poolItems}
      selectedItemId={selectedItemId}
      showHeader={false}
      showControls={false}
      onDragStart={onDragStart}
      onDropItem={onDropItem}
      onSelectItem={onSelectItem}
      testId={includeTestIds ? "item-dock" : null}
    />
  </section>
));

PresentationSurface.displayName = "PresentationSurface";
