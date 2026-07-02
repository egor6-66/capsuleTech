import type { JSX, ValidComponent } from 'solid-js';

/**
 * Side of the anchor the panel is placed on.
 * The panel auto-flips to the opposite side when there is no room in the
 * viewport (main-axis flip), and is clamped on the cross-axis.
 */
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

/**
 * Root tooltip container.
 *
 * Manages open/close state + positioning. Two positioning modes:
 *
 * - **cursor mode** (`cursorTracking` — default): the panel anchors to the
 *   pointer and *follows it* while the pointer stays inside the trigger.
 *   Ideal for large triggers (a 1000px element shows the hint at the cursor,
 *   not at the element's edge). Closes as soon as the pointer leaves the
 *   trigger.
 * - **element mode** (`cursorTracking={false}`): the panel anchors to the
 *   trigger's bounding box at the position given by `placement`, and closes
 *   when the pointer leaves the trigger.
 *
 * The panel is `pointer-events: none` in both modes — it never intercepts the
 * pointer, so leaving the trigger reliably closes it.
 */
export interface ITooltipProps {
  /**
   * When true (default) the panel anchors to — and follows — the cursor.
   * When false the panel anchors to the trigger's bounding box.
   */
  cursorTracking?: boolean;
  /** Side of the anchor to place the panel on. Default: `'bottom'`. */
  placement?: TooltipPlacement;
  /** Gap in px between the anchor and the panel. Default: `8`. */
  gutter?: number;
  /** Delay in ms before the tooltip opens on hover. Default: `700`. */
  openDelay?: number;
  /** Delay in ms before the tooltip closes on leave. Default: `0`. */
  closeDelay?: number;
  /** When true the tooltip never opens. */
  disabled?: boolean;
  /** Controlled open state. When provided, the component does not self-manage. */
  open?: boolean;
  /** Initial open state for the uncontrolled case. Default: `false`. */
  defaultOpen?: boolean;
  /** Called whenever the open state changes. */
  onOpenChange?: (open: boolean) => void;
  /** Tooltip trigger + content. */
  children?: JSX.Element;
}

/**
 * The element that shows/hides the tooltip on hover/focus.
 * Polymorphic via `as` prop (default: `<button>`).
 *
 * @example
 * ```tsx
 * <Tooltip.Trigger as="span">Hover me</Tooltip.Trigger>
 * <Tooltip.Trigger as={Button} variant="ghost">Action</Tooltip.Trigger>
 * ```
 */
export interface ITooltipTriggerProps extends JSX.HTMLAttributes<HTMLElement> {
  /**
   * Polymorphic render element. Default: `'button'`.
   * Pass any HTML tag string or a Solid component.
   */
  as?: ValidComponent;
  /** Extra CSS classes forwarded to the trigger element. */
  class?: string;
  /** Trigger label / children. */
  children?: JSX.Element;
}

/**
 * The tooltip panel, teleported into a Portal (default: `document.body`).
 *
 * Styled with theme tokens consistent with other panels (`Dropdown.Content`).
 * Small, compact layout — intended for short hints or lightweight previews.
 *
 * @example
 * ```tsx
 * <Tooltip.Content>Save changes</Tooltip.Content>
 * ```
 */
export interface ITooltipContentProps extends JSX.HTMLAttributes<HTMLElement> {
  /** Extra CSS classes merged with default panel styles. */
  class?: string;
  style?: JSX.CSSProperties | string;
  /** Props forwarded to the Portal wrapper. Useful for custom `mount` targets. */
  portalProps?: { mount?: Node };
  /** Tooltip body — string or JSX. */
  children?: JSX.Element;
}

/**
 * An optional decorative arrow pointing at the anchor.
 * Must be placed inside `Tooltip.Content`.
 */
export interface ITooltipArrowProps {
  /** Arrow size in pixels (default: 8). */
  size?: number;
  /** Extra CSS classes on the arrow element. */
  class?: string;
}
