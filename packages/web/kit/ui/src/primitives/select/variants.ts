import { cva } from '@capsuletech/web-style';

/**
 * Inlined INPUT_FIELD_BASE — tokens live in `@capsuletech/web-style`;
 * this string is a local aggregation for CVA. Kept in sync with
 * primitives/input/variants.ts and primitives/textarea/variants.ts.
 */
const INPUT_FIELD_BASE = [
  // Layout & sizing — common to all three controls
  'flex w-full rounded-md border border-input text-sm shadow-sm',
  // Horizontal padding shared by all three; height controlled per-control
  'px-input',
  // Transition covers bg, border colour, and box-shadow (ring)
  'transition-[background-color,border-color,box-shadow] duration-200',
  // Background state 1: empty
  'bg-transparent',
  // Suppress native outline; the active ring is supplied per-control
  'outline-none',
  // Placeholder
  'placeholder:text-muted-foreground',
  // Disabled
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

/**
 * Trigger button — visually matches `Input` / `Textarea` in size/border.
 *
 * The shared INPUT_FIELD_BASE carries layout, border, `px-input`, `bg-transparent`
 * and `outline-none`. It deliberately does NOT carry a focus-visible ring (see
 * input/base.ts comments): the trigger's only ring is the OPEN-state ring below.
 *
 * Kobalte data-attributes used for state:
 *   `data-[expanded]`           — set when the popover is open (any input method).
 *   `data-[placeholder-shown]`  — set when no value is selected (inverse of filled).
 *
 * ## Background / ring state mapping vs Input/Textarea
 *
 *   State     | Input/Textarea signal          | Select signal
 *   --------- | ------------------------------ | --------------------------------
 *   empty     | no `data-filled`               | `data-[placeholder-shown]` present
 *   filled    | `data-[filled]`                | no `data-[placeholder-shown]`
 *   active    | `:focus-visible`               | `data-[expanded]`
 *
 * Input/Textarea use `:focus-visible` so mouse-click also shows the ring. The
 * Select trigger uses `data-[expanded]` EXCLUSIVELY — Kobalte restores focus to
 * the trigger on close, and on Chromium that restore matches `:focus-visible`, so
 * a focus-visible ring here would falsely re-light after a mouse click-away. The
 * open ring is the affordance; no ring on the closed-but-focused trigger.
 *
 * ## Detached panel
 * The panel floats below the trigger with a small gutter (default 4 px, see
 * `SelectImpl`). Trigger corners remain fully rounded in the open state — no
 * seam-flattening. This avoids the 2-3 px pixel misalignment that floating-ui's
 * `shift` collision middleware introduces when the trigger is near a viewport edge:
 * with an attached single-block layout the shifted seam looks broken; with a
 * detached panel a small horizontal offset is imperceptible. The open state
 * therefore shows only a `ring-1 ring-ring` affordance, matching shadcn Select
 * canon.
 */
export const selectTriggerCva = cva(
  [
    INPUT_FIELD_BASE,
    // Fixed height — shadcn canon, matches Input (h-9)
    'h-9',
    // Trigger-specific layout (aligns chevron icon to the right)
    'items-center justify-between gap-2',
    // Typography
    'font-normal',
    // Background state 2: filled — no placeholder-shown means a value is selected
    '[&:not([data-placeholder-shown])]:bg-muted/40',
    // Open state — standard ring affordance (shadcn canon); border stays border-input
    'data-[expanded]:bg-background data-[expanded]:ring-1 data-[expanded]:ring-ring',
    // Placeholder text colour
    'data-[placeholder-shown]:text-muted-foreground',
  ].join(' '),
  {
    variants: {},
    defaultVariants: {},
  },
);

/**
 * Visual styles for the entire dropdown panel (applied directly to `KobalteSelect.Content`).
 *
 * Kobalte's Popper sets these CSS variables on the Content element:
 *   - `--kb-popper-anchor-width`            → the trigger's width
 *   - `--kb-popper-content-available-height`→ space between anchor and viewport edge
 * (Note: there is NO `--kb-select-content-available-*` — an earlier version used
 * those non-existent names, so `min-w`/`max-h` were silently inert.)
 *
 * ## Detached panel (shadcn canon)
 * The panel floats below the trigger with a gutter (default 4 px set via `gutter`
 * prop on `SelectImpl`). Width is pinned to the trigger via
 * `w-[var(--kb-popper-anchor-width)]` so the panel aligns horizontally even when
 * floating-ui's `shift` middleware applies a small horizontal correction near
 * viewport edges — a detached panel tolerates that offset; a seamless single-block
 * would not (visible seam misalignment).
 *
 * All four corners are rounded, full border uses `border-border` (matching
 * `Dropdown.Content` canon). No top-edge tricks.
 *
 * No panel padding — items run edge-to-edge so their highlight background spans the
 * full width; content spacing lives on the item (see `selectItemCva`).
 *
 * Enter + exit animation is driven by the `popover-animate` class from
 * `@capsuletech/web-style/index.css` using Kobalte's native data-attributes:
 *   - `data-[expanded]` → `popover-in` keyframe (opacity 0→1, scale 0.95→1)
 *   - `data-[closed]`   → `popover-out` keyframe (opacity 1→0, scale 1→0.95)
 * No `forceMount`, no motionone — Kobalte itself delays DOM removal while the
 * closing animation plays.
 */
export const selectContentCva = cva(
  [
    'z-50 w-[var(--kb-popper-anchor-width)]',
    // overflow-hidden: clip the rounded corners + clip the grid-rows collapse;
    // the scroll + max-height live on the inner content wrapper (see select.tsx).
    'overflow-hidden rounded-md',
    'border border-border bg-popover text-popover-foreground shadow-md outline-none',
  ].join(' '),
  {
    variants: {},
    defaultVariants: {},
  },
);

/**
 * Individual option row.
 * `data-[highlighted]` — keyboard/hover focus set by Kobalte.
 * `data-[disabled]`    — set by Kobalte when `disabled` prop is true.
 * `data-[selected]`    — set by Kobalte when this item is the active value.
 *
 * The row is full-bleed (no rounding, no horizontal panel padding) so its
 * highlight background spans the whole panel width; `pl-8`/`pr-2` provide the
 * content inset (left room for the check indicator, right breathing space).
 */
export const selectItemCva = cva(
  [
    'relative flex cursor-default select-none items-center gap-2',
    'py-1.5 pl-8 pr-2',
    'text-sm outline-none',
    // Highlighted state
    'transition-colors duration-200',
    'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
    // Disabled state
    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  ].join(' '),
  {
    variants: {},
    defaultVariants: {},
  },
);

/**
 * Checkmark indicator shown next to the selected item.
 */
export const selectItemIndicatorCva = cva(
  'absolute left-2 flex size-3.5 items-center justify-center text-primary',
  {
    variants: {},
    defaultVariants: {},
  },
);
