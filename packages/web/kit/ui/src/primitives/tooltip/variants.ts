import { cva } from '@capsuletech/web-style';

/**
 * Tooltip panel styles.
 *
 * Uses the same `bg-popover` + `text-popover-foreground` tokens as
 * `dropdownContentCva` so the panel adapts to any theme automatically.
 * Intentionally more compact than Dropdown.Content — no `min-w`, tighter
 * padding, slightly smaller radius — tooltip is a hint, not a menu.
 *
 * `data-[expanded]` / `data-[closed]` are set by Kobalte on the content
 * element and can be used for CSS entry/exit transitions.
 */
export const tooltipContentCva = cva(
  'z-50 overflow-hidden rounded-md border border-border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md outline-none',
  {
    variants: {},
    defaultVariants: {},
  },
);

/**
 * Arrow element rendered inside the tooltip panel.
 * `fill-popover` ensures the arrow matches the panel background.
 */
export const tooltipArrowCva = cva('fill-popover', {
  variants: {},
  defaultVariants: {},
});
