import type {
  TooltipContentProps,
  TooltipPortalProps,
  TooltipRootOptions,
  TooltipTriggerProps,
} from '@kobalte/core/tooltip';
import type { JSX, ValidComponent } from 'solid-js';

/**
 * Root tooltip container.
 *
 * Manages open/close state and cursor-tracking anchor logic.
 * Wraps `Tooltip.Root` from Kobalte — forwards all Kobalte root options.
 *
 * By default, the tooltip panel anchors to the cursor position at the moment
 * the trigger is hovered (frozen on open), rather than to the trigger element's
 * bounding box. Set `cursorTracking={false}` to revert to element-anchored behaviour.
 */
export interface ITooltipProps extends TooltipRootOptions {
  /**
   * When true (default), the tooltip opens at the cursor position and stays
   * there until closed. When false, falls back to Kobalte's default element-
   * anchored positioning.
   */
  cursorTracking?: boolean;
  /** Tooltip trigger + content. */
  children?: JSX.Element;
}

/**
 * The element that shows/hides the tooltip on hover/focus.
 * Polymorphic via `as` prop (default: `<button>`).
 *
 * Pointer-move tracking for cursor-based positioning is wired here; the
 * tracked position is consumed by the parent `Tooltip` root.
 *
 * @example
 * ```tsx
 * <Tooltip.Trigger as="span">Hover me</Tooltip.Trigger>
 * <Tooltip.Trigger as={Button} variant="ghost">Action</Tooltip.Trigger>
 * ```
 */
export interface ITooltipTriggerProps extends TooltipTriggerProps {
  /**
   * Polymorphic render element. Default: `'button'`.
   * Pass any HTML tag string or a Solid component.
   */
  as?: ValidComponent;
  /** Extra CSS classes forwarded to the trigger element. */
  class?: string;
  /** Trigger label / children. */
  children?: JSX.Element;
  /**
   * Called with the pointer's viewport coordinates on every `pointerMove`
   * while the trigger is hovered (before the tooltip opens).
   * Wired internally by `Tooltip` root — not for external use.
   * @internal
   */
  onPointerPositionChange?: (x: number, y: number) => void;
}

/**
 * The tooltip panel teleported into a Portal (mounted on `document.body`).
 *
 * Styled with theme tokens consistent with other Kobalte-backed panels
 * (`Dropdown.Content`, `Popover.Content`). Small, compact layout — intended
 * for short textual hints, not rich content.
 *
 * @example
 * ```tsx
 * <Tooltip.Content>Save changes</Tooltip.Content>
 * <Tooltip.Content>
 *   <strong>Tip:</strong> press Ctrl+S to save
 * </Tooltip.Content>
 * ```
 */
export interface ITooltipContentProps extends TooltipContentProps {
  /** Extra CSS classes merged with default panel styles. */
  class?: string;
  style?: JSX.CSSProperties | string;
  /** Props forwarded to the Portal wrapper. Useful for custom `mount` targets. */
  portalProps?: TooltipPortalProps;
  /** Tooltip body — string or JSX. */
  children?: JSX.Element;
}

/**
 * An optional decorative arrow pointing at the anchor.
 * Renders `<Tooltip.Arrow>` from Kobalte (`role="presentation"`).
 */
export interface ITooltipArrowProps {
  /** Arrow size in pixels (default: 8). */
  size?: number;
  /** Extra CSS classes on the arrow element. */
  class?: string;
}
