import { cva } from '@capsuletech/web-style';

import { INPUT_FIELD_BASE } from '../base';

/**
 * Trigger button — visually matches `Input` / `Textarea` in size/border.
 *
 * The shared INPUT_FIELD_BASE carries layout, border, `px-input`, `bg-transparent`
 * and `outline-none`. It deliberately does NOT carry a focus-visible ring (see
 * `base.ts`): the trigger's only ring is the OPEN-state ring below.
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
 * ## Single-block (attached panel)
 * When open, the bottom corners flatten (`data-[expanded]:rounded-b-none`) so the
 * trigger and the panel below (which flattens its top, see `selectContentCva`)
 * read as one continuous block with no rounded seam. Tuned for downward placement
 * (Kobalte exposes no placement data-attribute to flip these for upward opens).
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
    // Open state — bg + accent border (NOT a box-shadow ring): a border-colour flip
    // lets the trigger and the attached panel share one continuous outline (the
    // panel uses the same `border-ring`), reading as a single bordered block.
    'data-[expanded]:bg-background data-[expanded]:border-ring',
    // Single-block: flatten the seam shared with the attached panel
    'data-[expanded]:rounded-b-none',
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
 * ## Single-block (attached to trigger)
 * Width is pinned to the trigger width and the top corners flatten + top border is
 * dropped, so the panel continues the trigger as one block (paired with the
 * trigger's `data-[expanded]:rounded-b-none`). The side/bottom border uses
 * `border-ring` to match the open trigger's `border-ring`, giving the whole block
 * one continuous outline. Tuned for downward placement.
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
    'overflow-hidden rounded-md rounded-t-none',
    'border border-ring border-t-0 bg-popover text-popover-foreground shadow-md outline-none',
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
