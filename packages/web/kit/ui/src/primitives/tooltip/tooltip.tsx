import { cn } from '@capsuletech/web-style';
import {
  type Accessor,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  type JSX,
  onCleanup,
  onMount,
  Show,
  splitProps,
  useContext,
  type ValidComponent,
} from 'solid-js';
import { Portal } from 'solid-js/web';

import { useTrace } from '../../internal/useTrace';
import { useMountTarget } from '../../lib/mountTarget';
import { Slot } from '../slot';

import type {
  ITooltipArrowProps,
  ITooltipContentProps,
  ITooltipProps,
  ITooltipTriggerProps,
  TooltipPlacement,
} from './interfaces';
import { tooltipArrowCva, tooltipContentCva } from './variants';

// ---------------------------------------------------------------------------
// Positioning
// ---------------------------------------------------------------------------

interface IAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

const OPPOSITE: Record<TooltipPlacement, TooltipPlacement> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

/**
 * Pure geometry: place a `w×h` panel on `side` of `anchor` with `gutter` gap,
 * flipping to the opposite side when it would overflow the viewport on the
 * main axis, then clamping on the cross axis.
 *
 * All coordinates are viewport-relative (used with `position: fixed`).
 */
function computePosition(
  anchor: IAnchor,
  w: number,
  h: number,
  side: TooltipPlacement,
  gutter: number,
  vw: number,
  vh: number,
): { left: number; top: number; side: TooltipPlacement } {
  const margin = 8;
  const cx = anchor.x + anchor.width / 2;
  const cy = anchor.y + anchor.height / 2;

  const place = (s: TooltipPlacement) => {
    switch (s) {
      case 'bottom':
        return { left: cx - w / 2, top: anchor.y + anchor.height + gutter };
      case 'top':
        return { left: cx - w / 2, top: anchor.y - gutter - h };
      case 'right':
        return { left: anchor.x + anchor.width + gutter, top: cy - h / 2 };
      case 'left':
        return { left: anchor.x - gutter - w, top: cy - h / 2 };
    }
  };

  let resolved = side;
  let p = place(resolved);

  // Main-axis flip when there is no room on the requested side but room on
  // the opposite one.
  const overflows =
    (resolved === 'bottom' && p.top + h > vh - margin) ||
    (resolved === 'top' && p.top < margin) ||
    (resolved === 'right' && p.left + w > vw - margin) ||
    (resolved === 'left' && p.left < margin);

  if (overflows) {
    const flipped = OPPOSITE[resolved];
    const fp = place(flipped);
    const fits =
      (flipped === 'bottom' && fp.top + h <= vh - margin) ||
      (flipped === 'top' && fp.top >= margin) ||
      (flipped === 'right' && fp.left + w <= vw - margin) ||
      (flipped === 'left' && fp.left >= margin);
    if (fits) {
      resolved = flipped;
      p = fp;
    }
  }

  const clamp = (v: number, span: number, viewport: number) =>
    Math.min(Math.max(v, margin), Math.max(margin, viewport - span - margin));

  return {
    left: clamp(p.left, w, vw),
    top: clamp(p.top, h, vh),
    side: resolved,
  };
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ITooltipContext {
  open: Accessor<boolean>;
  disabled: Accessor<boolean>;
  tracking: Accessor<boolean>;
  placement: Accessor<TooltipPlacement>;
  gutter: Accessor<number>;
  triggerId: string;
  contentId: string;
  triggerEl: Accessor<HTMLElement | undefined>;
  setTriggerEl: (el: HTMLElement | undefined) => void;
  cursor: Accessor<{ x: number; y: number }>;
  setCursor: (pos: { x: number; y: number }) => void;
  requestOpen: (immediate?: boolean) => void;
  requestClose: (immediate?: boolean) => void;
  side: Accessor<TooltipPlacement>;
  setSide: (s: TooltipPlacement) => void;
}

const TooltipContext = createContext<ITooltipContext>();

const useTooltip = () => {
  const ctx = useContext(TooltipContext);
  if (!ctx) throw new Error('Tooltip subcomponents must be used within <Tooltip>');
  return ctx;
};

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

/**
 * Root tooltip container — owns open state + positioning mode.
 *
 * See {@link ITooltipProps}. Cursor mode (default) follows the pointer while
 * it stays inside the trigger; element mode anchors to the trigger box. Both
 * close as soon as the pointer leaves the trigger (the panel is
 * `pointer-events: none` and never keeps itself open).
 */
const TooltipImpl = (props: ITooltipProps) => {
  useTrace('web-ui.tooltip'); // ADR 062

  const tracking = () => props.cursorTracking !== false;
  const placement = () => props.placement ?? 'bottom';
  const gutter = () => props.gutter ?? 8;
  const openDelay = () => props.openDelay ?? 700;
  const closeDelay = () => props.closeDelay ?? 0;
  const disabled = () => props.disabled === true;

  const [uncontrolledOpen, setUncontrolledOpen] = createSignal(props.defaultOpen ?? false);
  const isControlled = () => props.open !== undefined;
  const open = () => (isControlled() ? (props.open as boolean) : uncontrolledOpen());

  const setOpen = (next: boolean) => {
    if (next === open()) return;
    if (!isControlled()) setUncontrolledOpen(next);
    props.onOpenChange?.(next);
  };

  const [cursor, setCursor] = createSignal({ x: 0, y: 0 });
  const [triggerEl, setTriggerEl] = createSignal<HTMLElement>();
  const [side, setSide] = createSignal<TooltipPlacement>(placement());

  const triggerId = createUniqueId();
  const contentId = createUniqueId();

  let openTimer: ReturnType<typeof setTimeout> | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  const clearTimers = () => {
    if (openTimer) clearTimeout(openTimer);
    if (closeTimer) clearTimeout(closeTimer);
    openTimer = undefined;
    closeTimer = undefined;
  };

  const requestOpen = (immediate = false) => {
    if (disabled()) return;
    clearTimers();
    const delay = immediate ? 0 : openDelay();
    if (delay <= 0) {
      setOpen(true);
      return;
    }
    openTimer = setTimeout(() => {
      openTimer = undefined;
      setOpen(true);
    }, delay);
  };

  const requestClose = (immediate = false) => {
    clearTimers();
    const delay = immediate ? 0 : closeDelay();
    if (delay <= 0) {
      setOpen(false);
      return;
    }
    closeTimer = setTimeout(() => {
      closeTimer = undefined;
      setOpen(false);
    }, delay);
  };

  // Escape closes an open tooltip (a11y parity with Kobalte).
  createEffect(() => {
    if (!open()) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose(true);
    };
    document.addEventListener('keydown', onKey);
    onCleanup(() => document.removeEventListener('keydown', onKey));
  });

  onCleanup(clearTimers);

  const ctx: ITooltipContext = {
    open,
    disabled,
    tracking,
    placement,
    gutter,
    triggerId,
    contentId,
    triggerEl,
    setTriggerEl,
    cursor,
    setCursor,
    requestOpen,
    requestClose,
    side,
    setSide,
  };

  return <TooltipContext.Provider value={ctx}>{props.children}</TooltipContext.Provider>;
};

// ---------------------------------------------------------------------------
// Trigger
// ---------------------------------------------------------------------------

/**
 * The element that shows the tooltip on hover/focus. Polymorphic via `as`
 * (default `<button>`). Wires open/close + cursor tracking.
 *
 * Claims the pointer/focus events (`pointerenter/leave/move`, `focusin/out`);
 * all other props (onClick, data-*, style, …) pass through untouched.
 */
const Trigger = (props: ITooltipTriggerProps) => {
  const ctx = useTooltip();
  const [local, others] = splitProps(props, ['class', 'as', 'ref']);

  const setRef = (el: HTMLElement) => {
    ctx.setTriggerEl(el);
    const r = local.ref as ((el: HTMLElement) => void) | HTMLElement | undefined;
    if (typeof r === 'function') r(el);
  };

  const onEnter = (e: PointerEvent) => {
    if (ctx.tracking()) ctx.setCursor({ x: e.clientX, y: e.clientY });
    ctx.requestOpen();
  };
  const onLeave = () => ctx.requestClose();
  const onMove = (e: PointerEvent) => {
    if (ctx.tracking()) ctx.setCursor({ x: e.clientX, y: e.clientY });
  };
  const onFocus = () => ctx.requestOpen(true);
  const onBlur = () => ctx.requestClose(true);

  return (
    <Slot
      as={(local.as ?? 'button') as ValidComponent}
      // `others` first so consumer props win for everything EXCEPT the
      // hover/focus events + wiring we explicitly claim below.
      {...(others as object)}
      ref={setRef}
      id={ctx.triggerId}
      class={cn(local.class)}
      aria-describedby={ctx.open() ? ctx.contentId : undefined}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onPointerMove={onMove}
      onFocusIn={onFocus}
      onFocusOut={onBlur}
    />
  );
};

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

/**
 * The positioned panel — a `pointer-events: none` fixed element following the
 * anchor. Kept hidden until measured once, so it never flashes at (0,0).
 */
const PositionedPanel = (props: {
  class?: string;
  style?: JSX.CSSProperties | string;
  children?: JSX.Element;
  rest: object;
}) => {
  const ctx = useTooltip();
  let panelRef: HTMLDivElement | undefined;

  const [size, setSize] = createSignal({ w: 0, h: 0 });
  const [positioned, setPositioned] = createSignal(false);

  const measure = () => {
    if (!panelRef) return;
    const w = panelRef.offsetWidth;
    const h = panelRef.offsetHeight;
    if (w !== size().w || h !== size().h) setSize({ w, h });
    setPositioned(true);
  };

  onMount(() => {
    measure();
    if (typeof ResizeObserver === 'function' && panelRef) {
      const ro = new ResizeObserver(measure);
      ro.observe(panelRef);
      onCleanup(() => ro.disconnect());
    }
  });

  // Element mode: the trigger box can move (scroll/resize) while open — bump a
  // tick so the anchor memo re-reads getBoundingClientRect. Cursor mode reads
  // the live cursor signal instead and needs no listeners.
  const [anchorTick, setAnchorTick] = createSignal(0);
  createEffect(() => {
    if (ctx.tracking()) return;
    const bump = () => setAnchorTick((n) => n + 1);
    window.addEventListener('scroll', bump, true);
    window.addEventListener('resize', bump);
    onCleanup(() => {
      window.removeEventListener('scroll', bump, true);
      window.removeEventListener('resize', bump);
    });
  });

  const anchor = createMemo<IAnchor>(() => {
    if (ctx.tracking()) {
      const c = ctx.cursor();
      return { x: c.x, y: c.y, width: 0, height: 0 };
    }
    anchorTick(); // re-read on scroll/resize
    const rect = ctx.triggerEl()?.getBoundingClientRect();
    return rect
      ? { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
      : { x: 0, y: 0, width: 0, height: 0 };
  });

  const pos = createMemo(() => {
    const a = anchor();
    const { w, h } = size();
    const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
    return computePosition(a, w, h, ctx.placement(), ctx.gutter(), vw, vh);
  });

  // Publish resolved side for the Arrow.
  createEffect(() => ctx.setSide(pos().side));

  const style = (): JSX.CSSProperties => {
    const p = pos();
    const base: JSX.CSSProperties = {
      position: 'fixed',
      left: `${Math.round(p.left)}px`,
      top: `${Math.round(p.top)}px`,
      'z-index': '50',
      'pointer-events': 'none',
      visibility: positioned() ? 'visible' : 'hidden',
    };
    return typeof props.style === 'object' ? { ...base, ...props.style } : base;
  };

  return (
    <div
      ref={(el) => {
        panelRef = el;
      }}
      role="tooltip"
      id={ctx.contentId}
      class={cn(tooltipContentCva(), props.class)}
      style={style()}
      {...(props.rest as object)}
    >
      {props.children}
    </div>
  );
};

/**
 * The tooltip panel, teleported into a Portal (default: `document.body`,
 * overridable via `<MountProvider>` or `portalProps.mount`). Renders nothing
 * while the tooltip is closed.
 */
const Content = (props: ITooltipContentProps) => {
  const ctx = useTooltip();
  const [local, others] = splitProps(props, ['class', 'style', 'portalProps', 'children']);
  const mountFromCtx = useMountTarget();

  const mount = () => local.portalProps?.mount ?? mountFromCtx();

  return (
    <Show when={ctx.open()}>
      <Portal mount={mount() as Node | undefined}>
        <PositionedPanel class={local.class} style={local.style} rest={others}>
          {local.children}
        </PositionedPanel>
      </Portal>
    </Show>
  );
};

// ---------------------------------------------------------------------------
// Arrow (optional)
// ---------------------------------------------------------------------------

/**
 * Optional decorative arrow — a small rotated square sitting on the panel edge
 * facing the anchor. Placement follows the resolved side (after auto-flip).
 * Must be placed inside `Tooltip.Content`.
 */
const Arrow = (props: ITooltipArrowProps) => {
  const ctx = useTooltip();
  const [local, others] = splitProps(props, ['size', 'class']);
  const size = () => local.size ?? 8;

  const style = (): JSX.CSSProperties => {
    const s = size();
    const half = s / 2;
    const common: JSX.CSSProperties = {
      position: 'absolute',
      width: `${s}px`,
      height: `${s}px`,
    };
    // Panel is on `side` of the anchor → arrow sits on the opposite edge.
    switch (ctx.side()) {
      case 'bottom':
        return {
          ...common,
          top: `${-half}px`,
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
        };
      case 'top':
        return {
          ...common,
          bottom: `${-half}px`,
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
        };
      case 'right':
        return {
          ...common,
          left: `${-half}px`,
          top: '50%',
          transform: 'translateY(-50%) rotate(45deg)',
        };
      case 'left':
        return {
          ...common,
          right: `${-half}px`,
          top: '50%',
          transform: 'translateY(-50%) rotate(45deg)',
        };
    }
  };

  return (
    <div
      aria-hidden="true"
      class={cn(tooltipArrowCva(), local.class)}
      style={style()}
      {...(others as object)}
    />
  );
};

// ---------------------------------------------------------------------------
// Compound export
// ---------------------------------------------------------------------------

/**
 * Tooltip primitive — a lightweight, self-contained hint/preview panel.
 *
 * Features:
 * - **Cursor mode** (default): the panel follows the pointer while it stays
 *   inside the trigger, and closes the moment the pointer leaves.
 * - **Element mode** (`cursorTracking={false}`): anchored to the trigger box.
 * - Instant, flash-free positioning (no async floating-ui hop).
 * - `pointer-events: none` panel — never blocks or keeps itself open.
 * - Portal-based content (mounts on `document.body`, overridable).
 * - Auto-flip near viewport edges + cross-axis clamp.
 * - Keyboard accessible: focus opens, Escape closes; `role="tooltip"` +
 *   `aria-describedby` wiring.
 * - Optional decorative `Tooltip.Arrow`.
 *
 * @example
 * ```tsx
 * // Basic — follows the cursor
 * <Tooltip>
 *   <Tooltip.Trigger>Hover me</Tooltip.Trigger>
 *   <Tooltip.Content>This is a tooltip</Tooltip.Content>
 * </Tooltip>
 *
 * // Large element — the tooltip tracks the cursor across it
 * <Tooltip>
 *   <Tooltip.Trigger as="div" class="h-64 w-full border rounded-lg">
 *     Hover anywhere inside
 *   </Tooltip.Trigger>
 *   <Tooltip.Content>Positioned at your cursor</Tooltip.Content>
 * </Tooltip>
 *
 * // Element-anchored (classic) behaviour, placed to the right
 * <Tooltip cursorTracking={false} placement="right">
 *   <Tooltip.Trigger>Hover me</Tooltip.Trigger>
 *   <Tooltip.Content>Standard anchor</Tooltip.Content>
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
