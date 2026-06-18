import { forwardRef, type CSSProperties, type DragEvent } from "react";

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

const cssNumber = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) ? `${Math.min(Math.max(value, min), max)}px` : `${fallback}px`;

const cssText = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value : fallback;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const presentationVariables = (board: EditorBoardState): CSSProperties => {
  const style = isRecord(board.style) ? board.style : {};

  return {
    ["--presentation-bg" as string]: cssText(style.background, "var(--theme-bg, #0f1218)"),
    ["--presentation-surface-bg" as string]: cssText(style.surfaceBackground, "transparent"),
    ["--presentation-row-bg" as string]: cssText(style.rowBackground, "rgba(3, 7, 18, 0.72)"),
    ["--presentation-row-border" as string]: cssText(style.rowBorderColor, "rgba(148, 163, 184, 0.22)"),
    ["--presentation-label-width" as string]: cssNumber(style.labelWidth, 132, 92, 220),
    ["--presentation-row-min-height" as string]: cssNumber(style.rowMinHeight, 104, 78, 150),
    ["--presentation-item-size" as string]: cssNumber(style.itemSize, 80, 58, 112),
    ["--presentation-item-bg" as string]: cssText(style.itemBackground, "rgba(15, 23, 42, 0.95)"),
    ["--presentation-item-border" as string]: cssText(style.itemBorderColor, "rgba(148, 163, 184, 0.22)"),
    ["--presentation-item-color" as string]: cssText(style.itemTextColor, "#e2e8f0"),
    ["--presentation-board-max-width" as string]: cssNumber(style.boardMaxWidth, 1120, 860, 1400)
  };
};

const presentationClasses = (board: EditorBoardState) => {
  const effects = isRecord(board.style) && isRecord(board.style.effects) ? board.style.effects : {};
  return [
    "workspace",
    "presentation-export-surface",
    effects.glow ? "presentation-effect-glow" : "",
    effects.vignette ? "presentation-effect-vignette" : ""
  ].filter(Boolean).join(" ");
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
  <section
    ref={ref}
    className={presentationClasses(board)}
    style={presentationVariables(board)}
    data-testid={includeTestIds ? "presentation-surface" : undefined}
  >
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
