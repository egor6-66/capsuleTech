import { cva } from '@capsuletech/web-style';

/**
 * Popover panel that contains the dropdown items.
 * Uses `bg-popover` + `text-popover-foreground` so it adapts to any theme.
 *
 * Enter + exit animations are driven by the `popover-animate` class (web-style
 * `@keyframes popover-in`/`popover-out`) keyed off Kobalte's `data-[expanded]` /
 * `data-[closed]` attributes — applies to both `Content` and `SubContent`.
 */
export const dropdownContentCva = cva(
  'z-50 min-w-32 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none focus:outline-none focus-visible:outline-none',
  {
    variants: {},
    defaultVariants: {},
  },
);

/**
 * Individual interactive row inside the dropdown.
 * `data-[highlighted]` is set by Kobalte when the item has keyboard/hover focus.
 * `data-[disabled]` is set when `disabled` prop is true.
 */
export const dropdownItemCva = cva(
  'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  {
    variants: {},
    defaultVariants: {},
  },
);

/**
 * Horizontal rule divider between item groups.
 */
export const dropdownSeparatorCva = cva('-mx-1 my-1 h-px bg-border', {
  variants: {},
  defaultVariants: {},
});

/**
 * Non-interactive group label shown above a set of related items.
 */
export const dropdownLabelCva = cva('px-2 py-1.5 text-xs font-medium text-muted-foreground', {
  variants: {},
  defaultVariants: {},
});
