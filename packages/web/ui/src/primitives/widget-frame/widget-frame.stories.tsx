import { Settings2 } from 'lucide-solid';
import { createSignal } from 'solid-js';
import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { WidgetFrame, WidgetFrameGrip, WidgetFrameHandle } from '.';

const meta = {
  title: 'Components/WidgetFrame',
  component: WidgetFrame,
  tags: ['autodocs'],
} satisfies Meta<typeof WidgetFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const Frame = (p: {
  active?: boolean;
  gripCorner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  label?: string;
  children?: unknown;
}) => (
  <div style={{ width: '240px', height: '160px' }}>
    <WidgetFrame active={p.active} gripCorner={p.gripCorner}>
      <div class="flex h-full items-center justify-center text-sm text-muted-foreground">
        {p.label ?? 'Widget content'}
      </div>
    </WidgetFrame>
  </div>
);

// ---------------------------------------------------------------------------
// Resting — notch + dim rim, no glow
// ---------------------------------------------------------------------------
/** Resting: chamfered top-right corner + thin border rim. No glow. */
export const Resting: Story = {
  render: () => (
    <div class="p-8 bg-background">
      <Frame label="Resting (top-right chamfer)" />
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Active — bright rim + drop-shadow glow + WidgetFrameHandle brackets
// ---------------------------------------------------------------------------
/** Active: accent rim at full brightness + glow filter. Handles visible. */
export const Active: Story = {
  render: () => (
    <div class="p-8 bg-background">
      <div style={{ width: '240px', height: '160px' }}>
        <WidgetFrame
          active
          handles={
            <div class="absolute inset-0 pointer-events-none">
              {/* Corner bracket handles via WidgetFrameHandle */}
              <div class="absolute top-1 left-1">
                <WidgetFrameHandle corner="top-left" />
              </div>
              <div class="absolute top-1 right-1">
                <WidgetFrameHandle corner="top-right" />
              </div>
              <div class="absolute bottom-1 left-1">
                <WidgetFrameHandle corner="bottom-left" />
              </div>
              <div class="absolute bottom-1 right-1">
                <WidgetFrameHandle corner="bottom-right" />
              </div>
            </div>
          }
        >
          <div class="flex h-full items-center justify-center text-sm text-muted-foreground">
            Active + handles
          </div>
        </WidgetFrame>
      </div>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Toggle interactive
// ---------------------------------------------------------------------------
/** Toggle active state — see rim + glow transition. */
export const Toggled: Story = {
  render: () => {
    const [active, setActive] = createSignal(false);
    return (
      <div class="p-8 bg-background flex flex-col gap-4 items-start">
        <button
          type="button"
          class="text-xs text-muted-foreground underline"
          onClick={() => setActive((v) => !v)}
        >
          Toggle active (currently: {active() ? 'active' : 'resting'})
        </button>
        <div style={{ width: '240px', height: '160px' }}>
          <WidgetFrame active={active()}>
            <div class="flex h-full items-center justify-center text-sm text-muted-foreground">
              Click above
            </div>
          </WidgetFrame>
        </div>
      </div>
    );
  },
};

// ---------------------------------------------------------------------------
// All four grip corners — chamfer changes corner
// ---------------------------------------------------------------------------
/** All four gripCorner values — see the chamfer move. */
export const GripCorners: Story = {
  render: () => (
    <div class="p-8 bg-background grid grid-cols-2 gap-6">
      {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((corner) => (
        <Frame gripCorner={corner} label={corner} />
      ))}
    </div>
  ),
};

// ---------------------------------------------------------------------------
// See-through chamfer — patterned background shows through the notch
// ---------------------------------------------------------------------------
/** See-through notch: canvas pattern is visible through the chamfered corner. */
export const SeeThrough: Story = {
  render: () => (
    <div
      class="p-10"
      style={{
        background:
          'repeating-linear-gradient(45deg, #1a1a2e 0px, #1a1a2e 10px, #16213e 10px, #16213e 20px)',
      }}
    >
      <div class="flex flex-col gap-6">
        <div style={{ width: '240px', height: '160px' }}>
          <WidgetFrame>
            <div class="flex h-full items-center justify-center text-sm text-muted-foreground">
              Resting — look at corner
            </div>
          </WidgetFrame>
        </div>
        <div style={{ width: '240px', height: '160px' }}>
          <WidgetFrame active>
            <div class="flex h-full items-center justify-center text-sm text-muted-foreground">
              Active glow over pattern
            </div>
          </WidgetFrame>
        </div>
      </div>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// WidgetFrameHandle standalone
// ---------------------------------------------------------------------------
/** WidgetFrameHandle component — L-shaped bracket for each corner. */
export const HandleBrackets: Story = {
  render: () => (
    <div class="p-8 bg-background flex gap-6 items-center">
      {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((corner) => (
        <div class="flex flex-col items-center gap-1">
          <WidgetFrameHandle corner={corner} />
          <span class="text-xs text-muted-foreground">{corner}</span>
        </div>
      ))}
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Custom slots
// ---------------------------------------------------------------------------
/** Custom grip and controls via slots. */
export const CustomSlots: Story = {
  render: () => (
    <div class="p-8 bg-background">
      <div style={{ width: '240px', height: '160px' }}>
        <WidgetFrame
          grip={<WidgetFrameGrip kind="dnd" aria-label="Drag" />}
          gripClass="cap-widget-grip"
          gripCorner="bottom-left"
          controls={<Settings2 size={14} class="text-primary" />}
        >
          <div class="flex h-full items-center justify-center text-sm text-muted-foreground">
            Custom slots, grip bottom-left
          </div>
        </WidgetFrame>
      </div>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// WidgetFrameGrip standalone — both kinds
// ---------------------------------------------------------------------------
/** WidgetFrameGrip — both kinds side by side (DnD = Move icon, Resize = Maximize2). */
export const GripBadges: Story = {
  render: () => (
    <div class="p-8 bg-background flex gap-6 items-center">
      <div class="flex flex-col items-center gap-2">
        <WidgetFrameGrip kind="dnd" aria-label="Drag to move" />
        <span class="text-xs text-muted-foreground">kind="dnd"</span>
        <span class="text-xs text-muted-foreground opacity-60">cursor-grab</span>
      </div>
      <div class="flex flex-col items-center gap-2">
        <WidgetFrameGrip kind="resize" aria-label="Resize widget" />
        <span class="text-xs text-muted-foreground">kind="resize"</span>
        <span class="text-xs text-muted-foreground opacity-60">cursor-nwse-resize</span>
      </div>
      <div class="flex flex-col items-center gap-2">
        <WidgetFrameGrip kind="dnd" class="absolute right-2 top-2" aria-label="Positioned" />
        <span class="text-xs text-muted-foreground">with class= (relative parent)</span>
      </div>
    </div>
  ),
};
