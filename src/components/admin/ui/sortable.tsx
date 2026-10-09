"use client";

import type { ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

type HandleProps = { attributes: Record<string, unknown>; listeners: Record<string, unknown> | undefined };

/**
 * Drag-and-drop list. Works with mouse, touch, and keyboard (focus the handle, press Space,
 * move with the arrow keys, Space again to drop). `onReorder` receives the new array.
 */
export function SortableList<T>({
  items,
  getId,
  onReorder,
  renderItem,
  layout = "list",
  className,
  disabled,
}: {
  items: T[];
  getId: (item: T) => string;
  onReorder: (next: T[]) => void;
  renderItem: (item: T, handle: ReactNode, index: number) => ReactNode;
  layout?: "list" | "grid";
  className?: string;
  disabled?: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => getId(i) === active.id);
    const to = items.findIndex((i) => getId(i) === over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(items, from, to));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable: "To reorder, press Space or Enter to pick up, use the arrow keys to move, and press Space or Enter again to drop. Press Escape to cancel.",
        },
      }}
    >
      <SortableContext items={items.map(getId)} strategy={layout === "grid" ? rectSortingStrategy : verticalListSortingStrategy} disabled={disabled}>
        <div className={className}>
          {items.map((item, i) => (
            <SortableItem key={getId(item)} id={getId(item)} disabled={disabled}>
              {(h) => renderItem(item, <DragHandle {...h} disabled={disabled} />, i)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({ id, disabled, children }: { id: string; disabled?: boolean; children: (h: HandleProps) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative", isDragging && "z-20 opacity-90 [&>*]:shadow-lg [&>*]:ring-2 [&>*]:ring-primary")}
    >
      {children({ attributes: attributes as unknown as Record<string, unknown>, listeners })}
    </div>
  );
}

export function DragHandle({ attributes, listeners, disabled, className }: HandleProps & { disabled?: boolean; className?: string }) {
  if (disabled) return null;
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      aria-label="Drag to reorder"
      className={cn(
        "flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-secondary focus-visible:outline-2 focus-visible:outline-primary active:cursor-grabbing",
        className,
      )}
    >
      <GripVertical className="size-4" />
    </button>
  );
}
