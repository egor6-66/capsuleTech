import { cva } from '@capsuletech/web-style';

/**
 * Trigger button — visually matches `Input` in size/border/focus-ring.
 * `data-[expanded]` is set by Kobalte when the popover is open.
 * `data-[placeholder-shown]` is set by Kobalte when no value is selected.
 */
export const selectTriggerCva = cva(
  'flex h-auto w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-input py-input text-sm shadow-sm transition-colors duration-fast focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder-shown]:text-muted-foreground',
  {
    variants: {},
    defaultVariants: {},
  },
);

/**
 * Popover panel containing the list of items.
 * Same visual language as `Dropdown.Content`.
 */
export const selectContentCva = cva(
  'z-50 min-w-32 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none',
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
  'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 pl-8 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  {
    variants: {},
    defaultVariants: {},
  },
);

/**
 * Checkmark indicator shown next to the selected item.
 */
export const selectItemIndicatorCva = cva(
  'absolute left-2 flex size-3.5 items-center justify-center',
  {
    variants: {},
    defaultVariants: {},
  },
);
