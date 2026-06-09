import { Maximize2, Move } from 'lucide-solid';
import { Show, splitProps } from 'solid-js';

import type { IWidgetFrameGripProps, IWidgetFrameHandleProps, IWidgetFrameProps } from './interfaces';
import { getClipPath, gripCornerClasses } from './variants';

// ---------------------------------------------------------------------------
// WidgetFrameHandle — L-shaped bracket drawn with border + accent token.
// Exported so a host (web-flow) can place it inside its resize controls.
// ---------------------------------------------------------------------------

export const WidgetFrameHandle = (props: IWidgetFrameHandleProps) => {
  const size = 10; // bracket arm length in px
  const thickness = 2; // border width in px

  // Pick which two sides to draw as the L-bracket for each corner.
  const borderStyle = () => {
    const acc = 'var(--color-ring)';
    const none = '0px solid transparent';
    const solid = `${thickness}px solid ${acc}`;
    switch (props.corner) {
      case 'top-left':
        return { borderTop: solid, borderLeft: solid, borderBottom: none, borderRight: none };
      case 'top-right':
        return { borderTop: solid, borderRight: solid, borderBottom: none, borderLeft: none };
      case 'bottom-left':
        return { borderBottom: solid, borderLeft: solid, borderTop: none, borderRight: none };
      case 'bottom-right':
        return { borderBottom: solid, borderRight: solid, borderTop: none, borderLeft: none };
    }
  };

  return (
    <div
      class={props.class}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        ...borderStyle(),
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// WidgetFrameGrip — unified badge-button for DnD and resize handles.
// The host positions it (absolute/z-index via `class` prop).
// ---------------------------------------------------------------------------

const GRIP_BASE =
  'flex h-7 w-7 items-center justify-center rounded border border-border bg-card shadow-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-accent';

export const WidgetFrameGrip = (props: IWidgetFrameGripProps) => {
  const cursorClass = () =>
    props.kind === 'dnd' ? 'cursor-grab active:cursor-grabbing' : 'cursor-nwse-resize';

  return (
    <button
      type="button"
      class={`${GRIP_BASE} ${cursorClass()}${props.class ? ` ${props.class}` : ''}`}
      onPointerDown={props.onPointerDown}
      title={props.title}
      aria-label={props['aria-label']}
    >
      {props.kind === 'dnd' ? (
        <Move size={16} class="text-muted-foreground" />
      ) : (
        <Maximize2 size={16} class="text-muted-foreground" />
      )}
    </button>
  );
};

// ---------------------------------------------------------------------------
// WidgetFrame — main component
// ---------------------------------------------------------------------------

const RIM_WIDTH = 1.5; // px — thickness of accent rim

export const WidgetFrame = (props: IWidgetFrameProps) => {
  const [local, others] = splitProps(props, [
    'active',
    'children',
    'grip',
    'gripClass',
    'gripCorner',
    'controls',
    'handles',
    'class',
    'style',
  ]);

  const resolvedCorner = () => local.gripCorner ?? 'top-right';
  const resolvedGripClass = () => local.gripClass ?? 'cap-widget-grip';

  // clip-path shared by both rim + surface layers
  const clipPath = () => getClipPath(resolvedCorner());

  // Controls position: opposite of grip corner (never collide).
  // Grip top-right → controls top-left; otherwise top-right.
  const controlsClass = () => {
    const c = resolvedCorner();
    if (c === 'top-right') return 'absolute top-1 left-1 z-10';
    return 'absolute top-1 right-1 z-10';
  };

  // Grip sits in its corner, inside the chamfer triangle.
  // cursor is owned by the inner element (WidgetFrameGrip or custom), not the wrapper.
  const gripClass = () =>
    `absolute z-10 ${gripCornerClasses[resolvedCorner()]} ${resolvedGripClass()}`;

  // Active state tokens (CSS custom properties from theme)
  const rimColor = () => (local.active ? 'var(--color-ring)' : 'var(--color-border)');

  // Glow filter — only when active
  const glowFilter = () =>
    local.active
      ? 'drop-shadow(0 0 6px color-mix(in srgb, var(--color-ring) 40%, transparent))'
      : 'none';

  // Outer rim layer style (clipped, background = rim color)
  const rimLayerStyle = () => ({
    position: 'absolute' as const,
    inset: '0px',
    'clip-path': clipPath(),
    background: rimColor(),
    filter: glowFilter(),
    transition: 'background 0.2s, filter 0.2s',
    'pointer-events': 'none' as const,
  });

  // Surface layer style (inset by rim width, same clip, background = card)
  const surfaceLayerStyle = () => ({
    position: 'absolute' as const,
    inset: `${RIM_WIDTH}px`,
    'clip-path': clipPath(),
    background: 'var(--color-card)',
    overflow: 'hidden',
  });

  return (
    <div
      class={`relative h-full w-full${local.class ? ` ${local.class}` : ''}`}
      style={local.style}
      {...(others as object)}
    >
      {/* Outer rim layer — clipped polygon, rim color, glow when active */}
      <div style={rimLayerStyle()} />

      {/* Surface layer — inset by rim width, card background, content clips here */}
      <div style={surfaceLayerStyle()}>{local.children}</div>

      {/* Grip — sits in the chamfered corner above surface */}
      <div class={gripClass()}>
        {local.grip ?? <WidgetFrameGrip kind="dnd" aria-label="Drag to move" />}
      </div>

      {/* Controls — always visible, opposite corner from grip */}
      <div class={controlsClass()}>
        {local.controls ?? <WidgetFrameGrip kind="resize" aria-label="Resize widget" />}
      </div>

      {/* Resize handles — only when active */}
      <Show when={local.active}>{local.handles}</Show>
    </div>
  );
};
