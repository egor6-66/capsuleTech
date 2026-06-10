import { cva } from '@capsuletech/web-style';

import { INPUT_FIELD_BASE } from '../base';

/**
 * Trigger button — visually matches `Input` / `Textarea` in size/border/focus-ring.
 *
 * The shared INPUT_FIELD_BASE already carries:
 *   - `px-input`            → shared horizontal padding (py-input removed from base)
 *   - `focus:ring-1 focus-ring-ring`  → single clean ring, no border-colour flip
 *
 * Kobalte data-attributes used for state:
 *   `data-[expanded]`           — set when the popover is open (any input method).
 *   `data-[placeholder-shown]`  — set when no value is selected (inverse of filled).
 *
 * ## Background state mapping vs Input/Textarea
 *
 *   State     | Input/Textarea signal          | Select signal
 *   --------- | ------------------------------ | --------------------------------
 *   empty     | no `data-filled`               | `data-[placeholder-shown]` present
 *   filled    | `data-[filled]`                | no `data-[placeholder-shown]`
 *   active    | `:focus`                       | `:focus` AND `data-[expanded]`
 *
 * The open-state ring mirrors the focus ring (single ring, no border-colour change).
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
    // Open state — bg + single ring (mirrors :focus from base; no border-colour change)
    'data-[expanded]:bg-background',
    'data-[expanded]:ring-1 data-[expanded]:ring-ring data-[expanded]:outline-none',
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
