import type { VariantProps } from 'class-variance-authority';
import type { JSX } from 'solid-js';

import type { widgetFrameCva } from './variants';

export type WidgetFrameVariants = VariantProps<typeof widgetFrameCva>;

export interface IWidgetFrameProps extends JSX.HTMLAttributes<HTMLDivElement>, WidgetFrameVariants {
  /** Selected/active — reveals the `handles` slot + switches rim to ring color + glow. */
  active?: boolean;
  /** Drag-grip corner content (default: a grip glyph). */
  grip?: JSX.Element;
  /** Class applied to the grip element so a host can target it (e.g. xyflow dragHandle). Default 'cap-widget-grip'. */
  gripClass?: string;
  /** Which corner is chamfered and hosts the grip. Default 'top-right'. */
  gripCorner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Top-left control when grip is top-right (or top-right otherwise), ALWAYS visible (default: a control glyph). */
  controls?: JSX.Element;
  /** Resize handles — rendered ONLY when `active`. Host provides them (e.g. xyflow NodeResizeControl). */
  handles?: JSX.Element;
}

export interface IWidgetFrameHandleProps {
  /** Which corner this bracket sits on. */
  corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Extra classes. */
  class?: string;
}

export interface IWidgetFrameGripProps {
  /**
   * Interaction kind — drives icon and cursor.
   * - 'dnd'    → Move icon, cursor-grab / active:cursor-grabbing
   * - 'resize' → Maximize2 icon, cursor-nwse-resize
   */
  kind: 'dnd' | 'resize';
  /**
   * Positioning classes — supplied by the host (e.g. `absolute right-1 top-1 z-50`).
   * The component itself is a styled badge-button; the host only positions it.
   */
  class?: string;
  /** Forwarded to the root <button>. */
  onPointerDown?: (e: PointerEvent) => void;
  /** Forwarded to the root <button>. */
  title?: string;
  /** Forwarded to the root <button>. */
  'aria-label'?: string;
}
