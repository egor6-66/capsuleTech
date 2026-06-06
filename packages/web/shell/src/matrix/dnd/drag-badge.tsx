/**
 * DragBadge — per-cell drag handle badge.
 *
 * Thin host wrapper around the shared WidgetFrameGrip primitive (web-ui).
 * Visible only when 2+ draggable cells exist (swap has a target).
 *
 * Pointerdown on badge → calls dnd.startDrag for the associated cell.
 * The cell element is registered as a draggable (via createDraggable ref)
 * but with disabled=true so the cell surface itself does not trigger drag.
 *
 * Must be rendered inside <DnDProvider> tree.
 */
import type { DraggableId } from '@capsuletech/web-dnd';
import { useDnD } from '@capsuletech/web-dnd';
import { WidgetFrameGrip } from '@capsuletech/web-ui';

interface IDragBadgeProps {
  /** The draggable id to activate on pointerdown (matches createDraggable id). */
  draggableId: DraggableId;
}

export const DragBadge = (props: IDragBadgeProps) => {
  const dnd = useDnD();

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    dnd.startDrag(props.draggableId, e);
  };

  return (
    <WidgetFrameGrip
      kind="dnd"
      class="absolute right-1 top-1 z-50"
      title="Drag to swap"
      aria-label="Drag to swap cell"
      onPointerDown={onPointerDown}
    />
  );
};
