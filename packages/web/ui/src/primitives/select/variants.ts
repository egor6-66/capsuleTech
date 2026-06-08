import { cva } from '@capsuletech/web-style';

/**
 * Trigger button — visually matches `Input` in size/border/focus-ring.
 * `data-[expanded]`       — set by Kobalte when the popover is open.
 * `data-[placeholder-shown]` — set by Kobalte when no value is selected.
 *
 * The chevron icon inside `KobalteSelect.Icon` carries its own
 * `data-[expanded]:rotate-180` class for the rotation animation.
 */
export const selectTriggerCva = cva(
  [
    // Layout & sizing — identical to Input
    'flex h-auto w-full items-center justify-between gap-2 rounded-md',
    // Border & background
    'border border-input bg-background px-input py-input',
    // Typography
    'text-sm font-normal',
    // Shadow to match Input
    'shadow-sm',
    // Focus ring
    'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
    // Open state — ring to signal focus
    'data-[expanded]:border-ring data-[expanded]:ring-1 data-[expanded]:ring-ring',
    // States
    'disabled:cursor-not-allowed disabled:opacity-50',
    'data-[placeholder-shown]:text-muted-foreground',
    // Smooth border/ring transition
    'transition-[border-color,box-shadow] duration-fast',
  ].join(' '),
  {
    variants: {},
    defaultVariants: {},
  },
);

/**
 * Visual styles for the entire dropdown panel (applied directly to `KobalteSelect.Content`).
 *
 * Kobalte sets `--kb-select-content-available-width` / `-height` on the Content
 * element; `min-w` / `max-h` via `var()` resolve correctly because they live on
 * the same element.
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
    // Stacking & layout
    'z-50 min-w-[var(--kb-select-content-available-width)] max-h-[var(--kb-select-content-available-height)]',
    'overflow-auto rounded-md',
    // Visual — same token family as Dropdown.Content
    'border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none',
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
 */
export const selectItemCva = cva(
  [
    'relative flex cursor-default select-none items-center gap-2 rounded-sm',
    // Left padding accommodates the absolute-positioned check indicator
    'px-2 py-1.5 pl-8',
    'text-sm outline-none',
    // Highlighted state
    'transition-colors duration-fast',
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
