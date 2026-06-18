import { useState, type DragEvent, type KeyboardEvent } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { EditorBoardState, EditorContainer, EditorBoardItem, EditorTier } from "../domain/editorTypes";
import { RowEditor } from "./RowEditor";

type TierBoardProps = {
  board: EditorBoardState;
  selectedItemId: string | null;
  selectedItem: EditorBoardItem | null;
  canEditRows?: boolean;
  onDragStart: (event: DragEvent<HTMLElement>, itemId: string) => void;
  onDropItem: (event: DragEvent<HTMLElement>, target: EditorContainer) => void;
  onMoveItem: (itemId: string, target: EditorContainer) => Promise<void> | void;
  onSelectItem: (itemId: string) => void;
  onInsertRow?: (afterRowId?: string) => Promise<void> | void;
  onUpdateRow?: (rowId: string, patch: { label: string; color: string }) => Promise<void> | void;
  onReorderRows?: (rowIdsInOrder: string[]) => Promise<void> | void;
  onRemoveRow?: (rowId: string) => Promise<void> | void;
  testId?: string | null;
};

type TierRowProps = {
  tier: EditorTier;
  tierItems: EditorBoardItem[];
  selectedItemId: string | null;
  selectedItem: EditorBoardItem | null;
  canEditRows: boolean;
  canRemoveRows: boolean;
  isFirst: boolean;
  isLast: boolean;
  onDragStart: (event: DragEvent<HTMLElement>, itemId: string) => void;
  onDropItem: (event: DragEvent<HTMLElement>, target: EditorContainer) => void;
  onMoveItem: (itemId: string, target: EditorContainer) => Promise<void> | void;
  onSelectItem: (itemId: string) => void;
  onEditRow: (row: EditorTier) => void;
  onInsertRow: (afterRowId?: string) => Promise<void> | void;
  onMoveRow: (rowId: string, direction: -1 | 1) => void;
  onRemoveRow: (rowId: string) => Promise<void> | void;
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

const SortableTierRow = ({
  tier,
  tierItems,
  selectedItemId,
  selectedItem,
  canEditRows,
  canRemoveRows,
  isFirst,
  isLast,
  onDragStart,
  onDropItem,
  onMoveItem,
  onSelectItem,
  onEditRow,
  onInsertRow,
  onMoveRow,
  onRemoveRow
}: TierRowProps) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: tier.id,
    disabled: !canEditRows
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`tier-row ${selectedItem ? "targetable" : ""} ${isDragging ? "sorting" : ""}`}
      tabIndex={0}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDropItem(event, tier.id)}
      onClick={() => selectedItem && void onMoveItem(selectedItem.id, tier.id)}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) {
          return;
        }
        if (selectedItem && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          void onMoveItem(selectedItem.id, tier.id);
        }
      }}
    >
      <div className="tier-label" style={{ backgroundColor: tier.color, color: tier.textColor }}>
        <span>{tier.label}</span>
        {canEditRows ? (
          <div className="row-controls" onClick={(event) => event.stopPropagation()}>
            <button
              ref={setActivatorNodeRef}
              className="row-control"
              type="button"
              aria-label={`Drag row ${tier.label}`}
              {...attributes}
              {...listeners}
            >
              ::
            </button>
            <button className="row-control" type="button" aria-label={`Edit row ${tier.label}`} onClick={() => onEditRow(tier)}>
              Edit
            </button>
            <button className="row-control" type="button" aria-label={`Move row ${tier.label} up`} disabled={isFirst} onClick={() => onMoveRow(tier.id, -1)}>
              Up
            </button>
            <button className="row-control" type="button" aria-label={`Move row ${tier.label} down`} disabled={isLast} onClick={() => onMoveRow(tier.id, 1)}>
              Down
            </button>
            <button className="row-control" type="button" aria-label={`Add row after ${tier.label}`} onClick={() => void onInsertRow(tier.id)}>
              +
            </button>
            <button className="row-control" type="button" aria-label={`Delete row ${tier.label}`} disabled={!canRemoveRows} onClick={() => void onRemoveRow(tier.id)}>
              -
            </button>
          </div>
        ) : null}
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
};

export const TierBoard = ({
  board,
  selectedItemId,
  selectedItem,
  canEditRows = false,
  onDragStart,
  onDropItem,
  onMoveItem,
  onSelectItem,
  onInsertRow,
  onUpdateRow,
  onReorderRows,
  onRemoveRow,
  testId = "tier-board"
}: TierBoardProps) => {
  const [editingRow, setEditingRow] = useState<EditorTier | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );
  const rowIds = board.tiers.map((tier) => tier.id);

  const reorderRows = (rowIdsInOrder: string[]) => {
    if (onReorderRows) {
      void onReorderRows(rowIdsInOrder);
    }
  };

  const moveRow = (rowId: string, direction: -1 | 1) => {
    const currentIndex = rowIds.indexOf(rowId);
    const nextIndex = currentIndex + direction;
    if (currentIndex === -1 || nextIndex < 0 || nextIndex >= rowIds.length) {
      return;
    }
    reorderRows(arrayMove(rowIds, currentIndex, nextIndex));
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const currentIndex = rowIds.indexOf(String(active.id));
    const nextIndex = rowIds.indexOf(String(over.id));
    if (currentIndex === -1 || nextIndex === -1) {
      return;
    }
    reorderRows(arrayMove(rowIds, currentIndex, nextIndex));
  };

  return (
    <section className="board-stage" data-testid={testId ?? undefined}>
      <div className="board">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
            {board.tiers.map((tier, index) => {
              const tierItems = board.items.filter((item) => item.container === tier.id);
              return (
                <SortableTierRow
                  key={tier.id}
                  tier={tier}
                  tierItems={tierItems}
                  selectedItemId={selectedItemId}
                  selectedItem={selectedItem}
                  canEditRows={canEditRows}
                  canRemoveRows={board.tiers.length > 1}
                  isFirst={index === 0}
                  isLast={index === board.tiers.length - 1}
                  onDragStart={onDragStart}
                  onDropItem={onDropItem}
                  onMoveItem={onMoveItem}
                  onSelectItem={onSelectItem}
                  onEditRow={setEditingRow}
                  onInsertRow={(afterRowId) => onInsertRow?.(afterRowId)}
                  onMoveRow={moveRow}
                  onRemoveRow={(rowId) => onRemoveRow?.(rowId)}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      </div>

      {editingRow && onUpdateRow ? (
        <RowEditor row={editingRow} onClose={() => setEditingRow(null)} onSave={onUpdateRow} />
      ) : null}
    </section>
  );
};
