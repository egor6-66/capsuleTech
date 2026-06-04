import { cn } from '@capsuletech/web-style';
import { Tooltip as KobalteTooltip } from '@kobalte/core/tooltip';
import { createContext, createSignal, splitProps, useContext } from 'solid-js';

import type {
  ITooltipArrowProps,
  ITooltipContentProps,
  ITooltipProps,
  ITooltipTriggerProps,
} from './interfaces';
import { tooltipArrowCva, tooltipContentCva } from './variants';

// ---------------------------------------------------------------------------
// Internal context — shares cursor-update callback with Trigger
// ---------------------------------------------------------------------------

interface ITooltipCursorContext {
  setCursorPos: (pos: { x: number; y: number }) => void;
  tracking: () => boolean;
}

const TooltipCursorContext = createContext<ITooltipCursorContext>({
  setCursorPos: () => {},
  tracking: () => false,
});

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

/**
 * Root tooltip container.
 *
 * Manages open state + cursor-position tracking. When `cursorTracking` is
 * true (default), the panel anchors to the cursor position at the moment the
 * trigger is first hovered and stays frozen there until the tooltip closes.
 * This means a 1000px-tall element shows the tooltip near the cursor, not at
 * the element's bottom edge.
 *
 * Implementation:
 * 1. `cursorPos` stores the last known pointer position (updated while closed).
 * 2. `frozenPos` is set on open (via `onOpenChange`) and cleared on close.
 * 3. `getAnchorRect` returns `frozenPos` so floating-ui anchors to a 0×0 point
 *    at the cursor — the panel appears just below/above the cursor.
 */
const TooltipImpl = (props: ITooltipProps) => {
  const [local, kobalteProps] = splitProps(props, ['cursorTracking', 'children', 'onOpenChange']);

  const tracking = () => local.cursorTracking !== false;

  // Last pointer position seen while tooltip is closed.
  const [cursorPos, setCursorPos] = createSignal<{ x: number; y: number }>({ x: 0, y: 0 });
  // Frozen at the moment of open; null while closed.
  const [frozenPos, setFrozenPos] = createSignal<{ x: number; y: number } | null>(null);

  const handleOpenChange = (isOpen: boolean) => {
    if (tracking()) {
      if (isOpen) {
        // Freeze cursor position so the panel doesn't follow mouse re-renders.
        setFrozenPos(cursorPos());
      } else {
        setFrozenPos(null);
      }
    }
    local.onOpenChange?.(isOpen);
  };

  /**
   * Returns an AnchorRect anchored to the frozen cursor position.
   * `width: 0, height: 0` makes floating-ui treat it as a point —
   * "bottom" placement puts the panel directly below the cursor.
   */
  const getAnchorRect = tracking()
    ? () => {
        const pos = frozenPos() ?? cursorPos();
        return { x: pos.x, y: pos.y, width: 0, height: 0 };
      }
    : undefined;

  return (
    <KobalteTooltip
      onOpenChange={handleOpenChange}
      getAnchorRect={getAnchorRect}
      gutter={8}
      {...(kobalteProps as object)}
    >
      <TooltipCursorContext.Provider value={{ setCursorPos, tracking }}>
        {local.children}
      </TooltipCursorContext.Provider>
    </KobalteTooltip>
  );
};

// ---------------------------------------------------------------------------
// Trigger
// ---------------------------------------------------------------------------

/**
 * The element that shows the tooltip on hover/focus.
 * Polymorphic via `as` prop (default: `<button>`).
 *
 * Attaches a `pointermove` listener to update the Root's cursor position
 * for cursor-anchored positioning (consumed via TooltipCursorContext).
 */
const Trigger = (props: ITooltipTriggerProps) => {
  const [local, others] = splitProps(props, ['class', 'as', 'onPointerPositionChange']);
  const ctx = useContext(TooltipCursorContext);

  const handlePointerMove = (e: PointerEvent) => {
    if (ctx.tracking()) {
      ctx.setCursorPos({ x: e.clientX, y: e.clientY });
    }
  };

  return (
    <KobalteTooltip.Trigger
      as={(local.as ?? 'button') as 'button'}
      class={cn(local.class)}
      onPointerMove={handlePointerMove}
      {...(others as object)}
    />
  );
};

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

/**
 * The tooltip panel, teleported to `document.body` via Kobalte's Portal.
 * Styled consistently with `Dropdown.Content` (same bg-popover/border-border
 * token family) but more compact: no min-width, tighter padding.
 */
const Content = (props: ITooltipContentProps) => {
  const [local, others] = splitProps(props, ['class', 'style', 'portalProps', 'children']);
  return (
    <KobalteTooltip.Portal {...local.portalProps}>
      <KobalteTooltip.Content
        class={cn(tooltipContentCva(), local.class)}
        style={local.style}
        {...(others as object)}
      >
        {local.children}
      </KobalteTooltip.Content>
    </KobalteTooltip.Portal>
  );
};

// ---------------------------------------------------------------------------
// Arrow (optional)
// ---------------------------------------------------------------------------

/**
 * Optional decorative arrow pointing from the panel toward the anchor point.
 * Must be placed inside `Tooltip.Content`.
 */
const Arrow = (props: ITooltipArrowProps) => {
  const [local, others] = splitProps(props, ['class']);
  return (
    <KobalteTooltip.Arrow class={cn(tooltipArrowCva(), local.class)} {...(others as object)} />
  );
};

// ---------------------------------------------------------------------------
// Compound export
// ---------------------------------------------------------------------------

/**
 * Tooltip primitive built on `@kobalte/core/tooltip`.
 *
 * Features:
 * - Cursor-anchored positioning (default): panel appears where the cursor
 *   hovered, frozen on open — ideal for large trigger elements.
 * - Keyboard accessible (focus also opens the tooltip).
 * - Portal-based content (mounted on `document.body`).
 * - Auto-flip via Kobalte/Floating-UI when near viewport edges.
 * - Optional decorative `Tooltip.Arrow`.
 *
 * @example
 * ```tsx
 * // Basic
 * <Tooltip>
 *   <Tooltip.Trigger>Hover me</Tooltip.Trigger>
 *   <Tooltip.Content>This is a tooltip</Tooltip.Content>
 * </Tooltip>
 *
 * // Large element — tooltip appears near the cursor, not at the element edge
 * <Tooltip>
 *   <Tooltip.Trigger as="div" class="h-64 w-full border rounded-lg">
 *     Hover anywhere inside
 *   </Tooltip.Trigger>
 *   <Tooltip.Content>Positioned at your cursor</Tooltip.Content>
 * </Tooltip>
 *
 * // Disable cursor tracking (element-anchored, standard behaviour)
 * <Tooltip cursorTracking={false}>
 *   <Tooltip.Trigger>Hover me</Tooltip.Trigger>
 *   <Tooltip.Content>Standard anchor</Tooltip.Content>
 * </Tooltip>
 *
 * // With arrow
 * <Tooltip>
 *   <Tooltip.Trigger>Info</Tooltip.Trigger>
 *   <Tooltip.Content>
 *     Tooltip body
 *     <Tooltip.Arrow />
 *   </Tooltip.Content>
 * </Tooltip>
 * ```
 */
export const Tooltip = Object.assign(TooltipImpl, {
  Trigger,
  Content,
  Arrow,
});

// Named re-exports for `createLazy` in web-core/ui-kit/imports.tsx.
export { Arrow as TooltipArrow, Content as TooltipContent, Trigger as TooltipTrigger };
